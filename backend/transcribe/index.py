import json
import os
import base64
import tempfile
import urllib.request
import urllib.error


def handler(event: dict, context) -> dict:
    """Транскрибация голосового сообщения через Whisper-совместимый API.
    Принимает base64-аудио (webm/wav/ogg/mp4), возвращает текст на русском.
    Поддерживает OpenAI и любой совместимый провайдер через WHISPER_API_URL."""

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

    api_key = os.environ.get('OPENAI_API_KEY', '')
    # Поддержка кастомного провайдера — по умолчанию OpenAI
    api_url = os.environ.get('WHISPER_API_URL', 'https://api.openai.com/v1/audio/transcriptions')
    # Модель по умолчанию whisper-1, можно переопределить через WHISPER_MODEL
    model = os.environ.get('WHISPER_MODEL', 'whisper-1')

    if not api_key:
        # Без ключа возвращаем пустой текст (не ошибку) — фронт покажет заглушку
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'text': '', 'error': 'no_key'})}

    body = json.loads(event.get('body') or '{}')
    audio_b64 = body.get('audio', '')
    audio_format = body.get('format', 'webm')

    if not audio_b64:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'audio обязателен'})}

    audio_bytes = base64.b64decode(audio_b64)

    if len(audio_bytes) < 500:
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'text': ''})}

    ext_map = {'webm': 'webm', 'wav': 'wav', 'ogg': 'ogg', 'mp4': 'mp4', 'mp3': 'mp3'}
    ext = ext_map.get(audio_format, 'webm')

    with tempfile.NamedTemporaryFile(suffix=f'.{ext}', delete=False) as f:
        f.write(audio_bytes)
        tmp_path = f.name

    try:
        boundary = '----FormBoundary7MA4YWxkTrZu0gW'
        mime_types = {'webm': 'audio/webm', 'wav': 'audio/wav', 'ogg': 'audio/ogg', 'mp4': 'audio/mp4', 'mp3': 'audio/mpeg'}
        mime = mime_types.get(ext, 'audio/webm')

        form_header = (
            f'--{boundary}\r\n'
            f'Content-Disposition: form-data; name="file"; filename="audio.{ext}"\r\n'
            f'Content-Type: {mime}\r\n\r\n'
        ).encode('utf-8')

        form_tail = (
            f'\r\n--{boundary}\r\n'
            f'Content-Disposition: form-data; name="model"\r\n\r\n{model}'
            f'\r\n--{boundary}\r\n'
            f'Content-Disposition: form-data; name="language"\r\n\r\nru'
            f'\r\n--{boundary}--\r\n'
        ).encode('utf-8')

        post_data = form_header + audio_bytes + form_tail

        req = urllib.request.Request(
            api_url,
            data=post_data,
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': f'multipart/form-data; boundary={boundary}',
            },
            method='POST'
        )

        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode('utf-8'))
            text = result.get('text', '').strip()

        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'text': text})}

    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'text': '', 'error': f'api_error: {err_body[:200]}'})}
    except Exception as e:
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'text': '', 'error': str(e)})}
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass
