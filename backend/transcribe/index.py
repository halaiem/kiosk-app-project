import json
import os
import base64
import uuid
import urllib.request
import urllib.error
import boto3


def detect_real_format(audio_bytes: bytes, declared: str) -> str:
    """Определяет реальный формат по magic bytes заголовка файла."""
    if audio_bytes[:4] == b'OggS':
        return 'ogg'
    if audio_bytes[:4] == b'fLaC':
        return 'flac'
    if audio_bytes[:3] == b'ID3' or audio_bytes[:2] == b'\xff\xfb':
        return 'mp3'
    if audio_bytes[:4] == b'RIFF':
        return 'wav'
    return declared


def handler(event: dict, context) -> dict:
    """Принимает base64-аудио, сохраняет в S3, транскрибирует через Яндекс SpeechKit.
    Возвращает: text (распознанный текст) и audio_url (ссылка на аудио в CDN)."""

    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
                'Access-Control-Max-Age': '86400',
            },
            'body': ''
        }

    headers = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}

    if event.get('httpMethod') != 'POST':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}

    body = json.loads(event.get('body') or '{}')
    audio_b64 = body.get('audio', '')
    audio_format = body.get('format', 'webm')
    do_transcribe = body.get('transcribe', False)

    if not audio_b64:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'audio обязателен'})}

    audio_bytes = base64.b64decode(audio_b64)

    real_format = detect_real_format(audio_bytes, audio_format)
    print(f"[transcribe] bytes={len(audio_bytes)}, declared={audio_format}, real={real_format}, transcribe={do_transcribe}")

    ext_map = {'webm': 'webm', 'wav': 'wav', 'ogg': 'ogg', 'mp4': 'mp4', 'mp3': 'mp3'}
    ext = ext_map.get(real_format, real_format)
    mime_map = {'webm': 'audio/webm', 'wav': 'audio/wav', 'ogg': 'audio/ogg', 'mp4': 'audio/mp4', 'mp3': 'audio/mpeg'}
    mime = mime_map.get(ext, 'audio/webm')

    audio_url = None
    try:
        aws_key = os.environ.get('AWS_ACCESS_KEY_ID', '')
        aws_secret = os.environ.get('AWS_SECRET_ACCESS_KEY', '')
        if aws_key and aws_secret:
            s3 = boto3.client('s3', endpoint_url='https://bucket.poehali.dev',
                              aws_access_key_id=aws_key, aws_secret_access_key=aws_secret)
            s3_key = f'voice/{uuid.uuid4()}.{ext}'
            s3.put_object(Bucket='files', Key=s3_key, Body=audio_bytes, ContentType=mime)
            audio_url = f"https://cdn.poehali.dev/projects/{aws_key}/bucket/{s3_key}"
            print(f"[transcribe] S3 ok: {audio_url}")
    except Exception as e:
        print(f"[transcribe] S3 error: {e}")

    text = ''
    if do_transcribe:
        api_key = os.environ.get('YANDEX_SPEECHKIT_KEY', '')
        print(f"[transcribe] YANDEX_SPEECHKIT_KEY={'SET' if api_key else 'MISSING'}")

        if not api_key:
            return {'statusCode': 200, 'headers': headers,
                    'body': json.dumps({'text': '', 'audio_url': audio_url, 'error': 'no_key'})}

        if len(audio_bytes) < 500:
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'text': '', 'audio_url': audio_url})}

        yandex_format_map = {'ogg': 'oggopus', 'mp3': 'mp3', 'wav': 'lpcm', 'webm': 'oggopus', 'mp4': 'oggopus', 'flac': 'lpcm'}
        yandex_format = yandex_format_map.get(real_format, 'oggopus')
        print(f"[transcribe] yandex_format={yandex_format}, real_format={real_format}")

        # Для WAV/LPCM — вырезаем заголовок (44 байта) и передаём сырой PCM
        send_bytes = audio_bytes
        if real_format == 'wav' and audio_bytes[:4] == b'RIFF':
            send_bytes = audio_bytes[44:]
            print(f"[transcribe] stripped WAV header, pcm_bytes={len(send_bytes)}")

        url = f'https://stt.api.cloud.yandex.net/speech/v1/stt:recognize?lang=ru-RU&format={yandex_format}&sampleRateHertz=16000&profanityFilter=false'

        try:
            req = urllib.request.Request(
                url,
                data=send_bytes,
                headers={
                    'Authorization': f'Api-Key {api_key}',
                    'Content-Type': mime,
                },
                method='POST'
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                result = json.loads(resp.read().decode('utf-8'))
                text = result.get('result', '').strip()
                print(f"[transcribe] Yandex ok: '{text[:80]}'")

        except urllib.error.HTTPError as e:
            err_body = e.read().decode('utf-8')
            print(f"[transcribe] Yandex HTTP {e.code}: {err_body[:300]}")
            return {'statusCode': 200, 'headers': headers,
                    'body': json.dumps({'text': '', 'audio_url': audio_url, 'error': err_body[:200]})}
        except Exception as e:
            print(f"[transcribe] error: {e}")
            return {'statusCode': 200, 'headers': headers,
                    'body': json.dumps({'text': '', 'audio_url': audio_url, 'error': str(e)})}

    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'text': text, 'audio_url': audio_url})}