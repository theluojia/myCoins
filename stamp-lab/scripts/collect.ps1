$ErrorActionPreference = 'Stop'
$labRoot = Split-Path -Parent $PSScriptRoot
$repoRoot = Split-Path -Parent $labRoot
$previewDir = Join-Path $labRoot 'assets/previews'
$seeds = Get-Content -LiteralPath (Join-Path $labRoot 'data/seeds.json') -Raw | ConvertFrom-Json
$coins = Get-Content -LiteralPath (Join-Path $repoRoot 'coin_data_simple.json') -Raw | ConvertFrom-Json
$coinById = @{}
foreach ($coin in $coins) { $coinById[$coin.id] = $coin }
New-Item -ItemType Directory -Force -Path $previewDir | Out-Null

function ConvertFrom-HtmlText([string]$Value) {
  $plain = $Value -replace '<[^>]*>', ''
  $plain = [System.Net.WebUtility]::HtmlDecode($plain)
  return ($plain -replace '\s+', ' ').Trim()
}

function Get-ImageExtension([string]$Url, [string]$ContentType) {
  $ext = [IO.Path]::GetExtension(([Uri]$Url).AbsolutePath).ToLowerInvariant()
  if ($ext -in @('.jpg', '.jpeg', '.png', '.webp', '.gif')) {
    if ($ext -eq '.jpeg') { return '.jpg' }
    return $ext
  }
  if ($ContentType -match 'png') { return '.png' }
  if ($ContentType -match 'webp') { return '.webp' }
  if ($ContentType -match 'gif') { return '.gif' }
  return '.jpg'
}

$links = [Collections.Generic.List[object]]::new()
$missingCoinIds = [Collections.Generic.List[object]]::new()

$stamps = @($seeds | ForEach-Object -Parallel {
  $seed = $_
  $stamp = [ordered]@{ id=$seed.id; catalogNo=$seed.catalogNo; title=$seed.title; pageUrl=$seed.pageUrl
    sourceSite='meetstamps'; retrievedAt=(Get-Date).ToUniversalTime().ToString('o'); status='ok'
    httpStatus=$null; pageTitle=$seed.title; issueDate=$seed.issueDate; sourceImageUrl=$null; preview=$null }
  try {
    Write-Host ('checking ' + $seed.id)
    $page = Invoke-WebRequest -Uri $seed.pageUrl -UseBasicParsing -TimeoutSec 25
    $stamp.httpStatus = [int]$page.StatusCode
    $html = $page.Content
    $heading = [regex]::Match($html, '<h2[^>]*>([\s\S]*?)</h2>', 'IgnoreCase')
    if ($heading.Success) {
      $stamp.pageTitle = ([System.Net.WebUtility]::HtmlDecode(($heading.Groups[1].Value -replace '<[^>]*>', '')) -replace '\s+', ' ').Trim()
    }
    $plain = ([System.Net.WebUtility]::HtmlDecode(($html -replace '<[^>]*>', '')) -replace '\s+', ' ').Trim()
    $date = [regex]::Match($plain, '(19\d{2}|20\d{2})[.年/-](\d{1,2})[.月/-](\d{1,2})')
    if ($date.Success) {
      $stamp.issueDate = '{0}-{1:D2}-{2:D2}' -f [int]$date.Groups[1].Value, [int]$date.Groups[2].Value, [int]$date.Groups[3].Value
    }
    $imageMatches = [regex]::Matches($html, '<img\b[^>]*\bsrc=["'']([^"'']+)["''][^>]*>', 'IgnoreCase')
    $imageMatch = $imageMatches | Where-Object { $_.Groups[1].Value -match '/wp-content/uploads/' } | Select-Object -First 1
    if (-not $imageMatch) {
      $stamp.status = 'missing_preview'
    } else {
      $imageUrl = $imageMatch.Groups[1].Value -replace '^http:', 'https:'
      $stamp.sourceImageUrl = $imageUrl
      $ext = [IO.Path]::GetExtension(([Uri]$imageUrl).AbsolutePath).ToLowerInvariant()
      if ($ext -notin @('.jpg','.jpeg','.png','.webp','.gif')) { $ext = '.jpg' }
      if ($ext -eq '.jpeg') { $ext = '.jpg' }
      $filename = $seed.id + $ext
      $localFile = Join-Path $using:previewDir $filename
      Invoke-WebRequest -Uri $imageUrl -UseBasicParsing -TimeoutSec 25 -OutFile $localFile
      $tag = $imageMatch.Value
      $widthMatch = [regex]::Match($tag, '\bwidth=["''](\d+)')
      $heightMatch = [regex]::Match($tag, '\bheight=["''](\d+)')
      $stamp.preview = [ordered]@{ localPath='assets/previews/' + $filename
        width=if($widthMatch.Success){[int]$widthMatch.Groups[1].Value}else{$null}
        height=if($heightMatch.Success){[int]$heightMatch.Groups[1].Value}else{$null}
        byteSize=(Get-Item -LiteralPath $localFile).Length
        sha256=(Get-FileHash -LiteralPath $localFile -Algorithm SHA256).Hash.ToLowerInvariant() }
    }
  } catch {
    $stamp.status = 'error'
    $stamp.error = $_.Exception.Message
  }
  [pscustomobject]$stamp
} -ThrottleLimit 8)

foreach ($seed in $seeds) {
  foreach ($coinId in $seed.coinIds) {
    if (-not $coinById.ContainsKey($coinId)) {
      $missingCoinIds.Add([pscustomobject]@{ stampId = $seed.id; coinId = $coinId })
      continue
    }
    $coin = $coinById[$coinId]
    $links.Add([pscustomobject][ordered]@{
      coinId = $coinId
      coinName = $coin.name
      coinYear = $coin.year
      stampId = $seed.id
      matchType = $seed.matchType
      confidence = $seed.confidence
      reason = $seed.reason
    })
  }
}

$statusCounts = [ordered]@{}
foreach ($group in ($stamps | Group-Object status)) { $statusCounts[$group.Name] = $group.Count }
$matchedCoinCount = @($links.coinId | Sort-Object -Unique).Count
$generatedAt = (Get-Date).ToUniversalTime().ToString('o')
$payload = [ordered]@{
  meta = [ordered]@{
    schemaVersion = 1
    generatedAt = $generatedAt
    source = 'https://meetstamps.com/'
    sourceCoinFile = '../coin_data_simple.json'
    stampCount = $stamps.Count
    relationCount = $links.Count
    matchedCoinCount = $matchedCoinCount
    totalCoinCount = $coins.Count
    coverage = [math]::Round($matchedCoinCount / $coins.Count, 4)
    statusCounts = $statusCounts
  }
  coins = @($coins | Select-Object id, name, year)
  stamps = $stamps
  links = $links
}
$pageErrors = @($stamps | Where-Object status -eq 'error' | Select-Object id, pageUrl, error)
$missingPreviews = @($stamps | Where-Object status -eq 'missing_preview' | Select-Object id, pageUrl)
$report = [ordered]@{
  generatedAt = $generatedAt
  valid = ($missingCoinIds.Count -eq 0 -and $pageErrors.Count -eq 0)
  stampCount = $stamps.Count
  relationCount = $links.Count
  matchedCoinCount = $matchedCoinCount
  statusCounts = $statusCounts
  missingCoinIds = $missingCoinIds
  pageErrors = $pageErrors
  missingPreviews = $missingPreviews
}

$payload | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $labRoot 'data/stamp-links.json') -Encoding utf8
$report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $labRoot 'data/validation-report.json') -Encoding utf8
$report | ConvertTo-Json -Depth 8
if ($missingCoinIds.Count -gt 0) { exit 1 }
