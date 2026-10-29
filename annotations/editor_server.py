#!/usr/bin/env python3
"""Local-only static server with a narrow API for saving annotation JSON files."""

from __future__ import annotations

import argparse
import json
import os
import re
import tempfile
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse


ROOT = Path(__file__).resolve().parents[1]
ANNOTATION_DIR = ROOT / "annotations"
COINS_FILE = ROOT / "coin_data.json"
ID_PATTERN = re.compile(r"^[A-Za-z0-9-]+$")
MAX_BODY_BYTES = 2 * 1024 * 1024


def load_coin_map() -> dict[str, dict]:
    with COINS_FILE.open("r", encoding="utf-8") as handle:
        return {coin["id"]: coin for coin in json.load(handle)}


def finite_ratio(value: object) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and 0 <= value <= 1


def validate_region(region: object, context: str) -> None:
    if not isinstance(region, dict):
        raise ValueError(f"{context} 不是对象")
    region_type = region.get("type")
    if region_type == "rect":
        keys = ("x", "y", "width", "height")
        if not all(finite_ratio(region.get(key)) for key in keys):
            raise ValueError(f"{context} 的矩形坐标无效")
        if region["width"] <= 0 or region["height"] <= 0:
            raise ValueError(f"{context} 的矩形尺寸必须大于 0")
        if region["x"] + region["width"] > 1 or region["y"] + region["height"] > 1:
            raise ValueError(f"{context} 的矩形超出图片")
    elif region_type == "ellipse":
        keys = ("cx", "cy", "rx", "ry")
        if not all(finite_ratio(region.get(key)) for key in keys):
            raise ValueError(f"{context} 的椭圆坐标无效")
        if region["rx"] <= 0 or region["ry"] <= 0:
            raise ValueError(f"{context} 的椭圆半径必须大于 0")
        if (
            region["cx"] - region["rx"] < 0
            or region["cy"] - region["ry"] < 0
            or region["cx"] + region["rx"] > 1
            or region["cy"] + region["ry"] > 1
        ):
            raise ValueError(f"{context} 的椭圆超出图片")
    elif region_type == "polygon":
        points = region.get("points")
        if not isinstance(points, list) or len(points) < 3:
            raise ValueError(f"{context} 的多边形至少需要 3 个顶点")
        if not all(
            isinstance(point, list)
            and len(point) == 2
            and all(finite_ratio(value) for value in point)
            for point in points
        ):
            raise ValueError(f"{context} 的多边形坐标无效")
    else:
        raise ValueError(f"{context} 使用了未知形状：{region_type}")


def validate_annotation(data: object, requested_id: str) -> dict:
    if not isinstance(data, dict):
        raise ValueError("JSON 顶层必须是对象")
    if data.get("id") != requested_id:
        raise ValueError("URL 中的编号与 JSON id 不一致")
    if data.get("version") != 1:
        raise ValueError("目前只支持 version: 1")

    coin = load_coin_map().get(requested_id)
    if coin is None:
        raise ValueError("coin_data.json 中不存在该编号")
    faces = data.get("faces")
    if not isinstance(faces, dict):
        raise ValueError("缺少 faces")

    for face_key, description_key in (("f", "description"), ("b", "description2")):
        face = faces.get(face_key)
        if not isinstance(face, dict):
            raise ValueError(f"缺少 {face_key} 面")
        image = face.get("image")
        if not isinstance(image, str) or image.startswith(("/", "\\")) or ".." in Path(image).parts:
            raise ValueError(f"{face_key} 面图片路径不安全")
        image_file = (ROOT / image).resolve()
        if ROOT not in image_file.parents or not image_file.is_file():
            raise ValueError(f"{face_key} 面图片不存在：{image}")
        items = face.get("items")
        if not isinstance(items, list) or not items:
            raise ValueError(f"{face_key} 面至少需要一个标记")
        description = str(coin.get(description_key) or "")
        for item_index, item in enumerate(items, start=1):
            context = f"{face_key} 面第 {item_index} 个标记"
            if not isinstance(item, dict):
                raise ValueError(f"{context} 不是对象")
            quote = item.get("quote")
            label = item.get("label")
            if not isinstance(quote, str) or not quote or quote not in description:
                raise ValueError(f"{context} 的原文不在币面描述中：{quote}")
            if not isinstance(label, str) or not label.strip():
                raise ValueError(f"{context} 缺少位置名称")
            regions = item.get("regions")
            if not isinstance(regions, list) or not regions:
                raise ValueError(f"{context} 至少需要一个区域")
            for region_index, region in enumerate(regions, start=1):
                validate_region(region, f"{context}的第 {region_index} 个区域")
    return data


class EditorHandler(SimpleHTTPRequestHandler):
    server_version = "CoinAnnotationEditor/1.0"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        if urlparse(self.path).path == "/api/health":
            self.send_json(200, {"annotationEditor": True, "root": str(ROOT)})
            return
        super().do_GET()

    def do_POST(self) -> None:  # noqa: N802
        path = unquote(urlparse(self.path).path)
        match = re.fullmatch(r"/api/annotations/([A-Za-z0-9-]+)", path)
        if match is None:
            self.send_json(404, {"error": "未知 API"})
            return
        annotation_id = match.group(1)
        if not ID_PATTERN.fullmatch(annotation_id):
            self.send_json(400, {"error": "编号格式无效"})
            return
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            content_length = 0
        if content_length <= 0 or content_length > MAX_BODY_BYTES:
            self.send_json(413, {"error": "请求正文为空或过大"})
            return

        try:
            raw = self.rfile.read(content_length)
            data = json.loads(raw.decode("utf-8"))
            validated = validate_annotation(data, annotation_id)
            target = ANNOTATION_DIR / f"{annotation_id}.json"
            with tempfile.NamedTemporaryFile(
                mode="w",
                encoding="utf-8",
                newline="\n",
                prefix=f".{annotation_id}.",
                suffix=".tmp",
                dir=ANNOTATION_DIR,
                delete=False,
            ) as handle:
                json.dump(validated, handle, ensure_ascii=False, indent=2)
                handle.write("\n")
                temp_name = handle.name
            os.replace(temp_name, target)
            self.send_json(200, {"ok": True, "file": str(target.relative_to(ROOT))})
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            self.send_json(400, {"error": f"JSON 无效：{error}"})
        except ValueError as error:
            self.send_json(400, {"error": str(error)})
        except OSError as error:
            self.send_json(500, {"error": f"写入失败：{error}"})

    def log_message(self, format_string: str, *args: object) -> None:
        print(f"[{self.log_date_time_string()}] {format_string % args}")


def main() -> None:
    parser = argparse.ArgumentParser(description="本地纪念币标记编辑服务")
    parser.add_argument("--host", default="127.0.0.1", help="监听地址，默认仅本机")
    parser.add_argument("--port", type=int, default=8001, help="监听端口，默认 8001")
    args = parser.parse_args()
    server = ThreadingHTTPServer((args.host, args.port), EditorHandler)
    print(f"标记编辑器：http://{args.host}:{args.port}/annotation_editor.html")
    print(f"项目目录：{ROOT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止标记编辑服务")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
