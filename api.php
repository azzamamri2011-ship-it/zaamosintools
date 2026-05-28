<?php
/**
 * ZaamTools API Proxy v2.0
 * Lebih stabil: retry logic, caching, timeout handling, rate limiting sederhana
 */

// ── Headers ──
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── Config ──
define('API_BASE',    'https://api.nexray.eu.cc/tools');
define('CACHE_DIR',   sys_get_temp_dir() . '/zaamtools_cache');
define('CACHE_TTL',   300);   // 5 menit
define('CURL_TIMEOUT', 20);   // detik total
define('CURL_CONNECT', 8);    // detik connect
define('MAX_RETRIES',  3);

// Buat cache dir jika belum ada
if (!is_dir(CACHE_DIR)) {
    @mkdir(CACHE_DIR, 0750, true);
}

// ── Router ──
$action = strtolower(trim($_GET['action'] ?? ''));
$startTime = microtime(true);

switch ($action) {
    case 'nik':
        handleNIK($startTime);
        break;
    case 'ip':
        handleIP($startTime);
        break;
    case 'ping':
        echo json_encode(['status' => true, 'message' => 'pong', 'time' => date('c')]);
        break;
    default:
        sendError(400, 'Aksi tidak dikenali. Gunakan: nik, ip');
}

// ──────────────────────────────────────────────
// HANDLER: NIK
// ──────────────────────────────────────────────
function handleNIK(float $startTime): void
{
    $nik = trim($_GET['nik'] ?? '');

    // Validasi
    if (empty($nik)) {
        sendError(400, 'Parameter nik diperlukan.');
    }
    if (!preg_match('/^\d{16}$/', $nik)) {
        sendError(400, 'NIK harus tepat 16 digit angka. Kamu memasukkan ' . strlen($nik) . ' karakter.');
    }

    $cacheKey = 'nik_' . md5($nik);
    $cached   = getCache($cacheKey);
    if ($cached !== null) {
        $cached['_cached']        = true;
        $cached['response_time']  = formatTime(microtime(true) - $startTime);
        echo json_encode($cached);
        return;
    }

    $url      = API_BASE . '/nikparse?nik=' . urlencode($nik);
    $response = curlWithRetry($url);

    if ($response === false) {
        sendError(503, 'Layanan NIK Parser tidak tersedia saat ini. Silakan coba beberapa saat lagi.');
    }

    $data = json_decode($response, true);
    if (json_last_error() !== JSON_ERROR_NONE || empty($data)) {
        sendError(502, 'Respons API tidak valid. Coba lagi.');
    }

    // Inject metadata
    $data['response_time'] = formatTime(microtime(true) - $startTime);
    $data['_cached']       = false;

    setCache($cacheKey, $data);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

// ──────────────────────────────────────────────
// HANDLER: IP
// ──────────────────────────────────────────────
function handleIP(float $startTime): void
{
    $target = trim($_GET['target'] ?? '');

    if (empty($target)) {
        sendError(400, 'Parameter target diperlukan. Masukkan IP address atau nama domain.');
    }

    // Sanitasi
    $target = strtolower($target);
    $target = preg_replace('/[^a-z0-9\.\:\-\_\[\]]/', '', $target);

    // Validasi: IPv4, IPv6, atau domain
    $isIPv4   = filter_var($target, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) !== false;
    $isIPv6   = filter_var($target, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) !== false;
    $isDomain = preg_match('/^(?:[a-z0-9](?:[a-z0-9\-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/', $target);

    if (!$isIPv4 && !$isIPv6 && !$isDomain) {
        sendError(400, 'Format IP atau domain tidak valid: "' . htmlspecialchars($target) . '"');
    }

    // Blokir private/loopback IP
    if ($isIPv4) {
        $privateRanges = [
            '127.', '10.', '192.168.', '172.16.', '172.17.', '172.18.',
            '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.',
            '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.',
            '172.31.', '0.0.0.0', '255.',
        ];
        foreach ($privateRanges as $prefix) {
            if (str_starts_with($target, $prefix)) {
                sendError(400, 'IP address privat/loopback tidak dapat dilacak.');
            }
        }
    }

    $cacheKey = 'ip_' . md5($target);
    $cached   = getCache($cacheKey);
    if ($cached !== null) {
        $cached['_cached']        = true;
        $cached['response_time']  = formatTime(microtime(true) - $startTime);
        echo json_encode($cached, JSON_UNESCAPED_UNICODE);
        return;
    }

    $url      = API_BASE . '/trackip?target=' . urlencode($target);
    $response = curlWithRetry($url);

    if ($response === false) {
        sendError(503, 'Layanan IP Tracker tidak tersedia saat ini. Silakan coba beberapa saat lagi.');
    }

    $data = json_decode($response, true);
    if (json_last_error() !== JSON_ERROR_NONE || empty($data)) {
        sendError(502, 'Respons API tidak valid. Coba lagi.');
    }

    $data['response_time'] = formatTime(microtime(true) - $startTime);
    $data['_cached']       = false;

    setCache($cacheKey, $data);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

// ──────────────────────────────────────────────
// CURL dengan retry exponential backoff
// ──────────────────────────────────────────────
function curlWithRetry(string $url, int $maxRetries = MAX_RETRIES): string|false
{
    $lastError = '';

    for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL             => $url,
            CURLOPT_RETURNTRANSFER  => true,
            CURLOPT_TIMEOUT         => CURL_TIMEOUT,
            CURLOPT_CONNECTTIMEOUT  => CURL_CONNECT,
            CURLOPT_SSL_VERIFYPEER  => true,
            CURLOPT_SSL_VERIFYHOST  => 2,
            CURLOPT_FOLLOWLOCATION  => true,
            CURLOPT_MAXREDIRS       => 5,
            CURLOPT_USERAGENT       => 'ZaamTools/2.0 (PHP/' . PHP_MAJOR_VERSION . '.' . PHP_MINOR_VERSION . ')',
            CURLOPT_HTTPHEADER      => [
                'Accept: application/json',
                'Accept-Encoding: gzip, deflate, br',
                'Cache-Control: no-cache',
            ],
            CURLOPT_ENCODING        => '',   // auto-decode gzip
        ]);

        $result   = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error    = curl_error($ch);
        curl_close($ch);

        if ($error) {
            $lastError = $error;
            // Backoff: 0.5s, 1s, 2s
            if ($attempt < $maxRetries) usleep((int)(500000 * pow(2, $attempt - 1)));
            continue;
        }

        if ($httpCode >= 200 && $httpCode < 300 && $result !== false && $result !== '') {
            return $result;
        }

        if ($httpCode >= 400) {
            // Client error — tidak perlu retry
            return $result ?: false;
        }

        // 5xx — coba lagi
        $lastError = "HTTP $httpCode";
        if ($attempt < $maxRetries) usleep((int)(500000 * pow(2, $attempt - 1)));
    }

    error_log("[ZaamTools] curlWithRetry gagal setelah $maxRetries percobaan: $lastError — URL: $url");
    return false;
}

// ──────────────────────────────────────────────
// Simple File Cache
// ──────────────────────────────────────────────
function getCache(string $key): ?array
{
    $file = CACHE_DIR . '/' . $key . '.json';
    if (!file_exists($file)) return null;
    if ((time() - filemtime($file)) > CACHE_TTL) {
        @unlink($file);
        return null;
    }
    $data = @json_decode(file_get_contents($file), true);
    return is_array($data) ? $data : null;
}

function setCache(string $key, array $data): void
{
    $file = CACHE_DIR . '/' . $key . '.json';
    // Jangan cache field volatile
    unset($data['response_time'], $data['_cached']);
    @file_put_contents($file, json_encode($data, JSON_UNESCAPED_UNICODE), LOCK_EX);
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function sendError(int $code, string $message): never
{
    http_response_code($code);
    echo json_encode([
        'status'  => false,
        'message' => $message,
        'code'    => $code,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function formatTime(float $seconds): string
{
    if ($seconds < 1) return round($seconds * 1000) . 'ms';
    return round($seconds, 2) . 's';
}
