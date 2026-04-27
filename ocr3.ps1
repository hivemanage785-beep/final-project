[Windows.System.UserProfile.GlobalizationPreferences, Windows.System.UserProfile, ContentType = WindowsRuntime] | Out-Null
[Windows.Globalization.Language, Windows.Foundation.UniversalApiContract, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Ocr.OcrEngine, Windows.Foundation.UniversalApiContract, ContentType = WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation.UniversalApiContract, ContentType = WindowsRuntime] | Out-Null

$langObj = [Windows.Globalization.Language]::new('en-US')
$ocrEngine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($langObj)

if (-not $ocrEngine) {
    Write-Host 'OCR Engine could not be created.'
    exit
}

$files = Get-ChildItem -Path 'plan\images\*.png'
foreach ($file in $files) {
    $fileStream = [System.IO.File]::OpenRead($file.FullName)
    $randomAccessStream = $fileStream.AsRandomAccessStream()
    $decoderTask = [Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($randomAccessStream).AsTask()
    $decoderTask.Wait()
    $decoder = $decoderTask.Result

    $softwareBitmapTask = $decoder.GetSoftwareBitmapAsync().AsTask()
    $softwareBitmapTask.Wait()
    $softwareBitmap = $softwareBitmapTask.Result

    $ocrTask = $ocrEngine.RecognizeAsync($softwareBitmap).AsTask()
    $ocrTask.Wait()
    $ocrResult = $ocrTask.Result

    Write-Host "
--- $($file.Name) ---"
    Write-Host $ocrResult.Text
    
    $softwareBitmap.Dispose()
    $randomAccessStream.Dispose()
    $fileStream.Dispose()
}
