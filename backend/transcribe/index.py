import json
import os
import base64
import tempfile
import urllib.request
import urllib.error
import uuid
import boto3


def handler(event: dict, context) -> dict:
    """Принимает base64-аудио, сохраняет в S3, транскрибирует через Whisper.
    Возвращает: text (распознанный текст) и audio_url (постоянная ссылка на аудио)."""

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
    print(f"[transcribe] audio_bytes={len(audio_bytes)}, format={audio_format}, transcribe={do_transcribe}")

    ext_map = {'webm': 'webm', 'wav': 'wav', 'ogg': 'ogg', 'mp4': 'mp4', 'mp3': 'mp3'}
    ext = ext_map.get(audio_format, 'webm')
    mime_types = {'webm': 'audio/webm', 'wav': 'audio/wav', 'ogg': 'audio/ogg', 'mp4': 'audio/mp4', 'mp3': 'audio/mpeg'}
    mime = mime_types.get(ext, 'audio/webm')

    # ── Сохранить аудио в S3 ─────────────────────────────────────────────────
    audio_url = None
    try:
        aws_key = os.environ.get('AWS_ACCESS_KEY_ID', '')
        aws_secret = os.environ.get('AWS_SECRET_ACCESS_KEY', '')
        if aws_key and aws_secret:
            s3 = boto3.client(
                's3',
                endpoint_url='https://bucket.poehali.dev',
                aws_access_key_id=aws_key,
                aws_secret_access_key=aws_secret,
            )
            s3_key = f'voice/{uuid.uuid4()}.{ext}'
            s3.put_object(Bucket='files', Key=s3_key, Body=audio_bytes, ContentType=mime)
            audio_url = f"https://cdn.poehali.dev/projects/{aws_key}/bucket/{s3_key}"
            print(f"[transcribe] saved to S3: {audio_url}")
        else:
            print("[transcribe] S3 keys missing, skipping upload")
    except Exception as e:
        print(f"[transcribe] S3 error: {e}")

    # ── Транскрибация ────────────────────────────────────────────────────────
    text = ''
    if do_transcribe:
        api_key = os.environ.get('OPENAI_API_KEY', '')
        api_url = os.environ.get('WHISPER_API_URL', 'https://api.openai.com/v1/audio/transcriptions')
        model = os.environ.get('WHISPER_MODEL', 'whisper-1')

        print(f"[transcribe] api_key={'SET' if api_key else 'MISSING'}, url={api_url}, model={model}")

        if not api_key:
            print("[transcribe] OPENAI_API_KEY not set!")
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'text': '', 'audio_url': audio_url, 'error': 'no_key'})}

        if len(audio_bytes) < 500:
            print(f"[transcribe] audio too small: {len(audio_bytes)} bytes")
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'text': '', 'audio_url': audio_url})}

        tmp_path = None
        try:
            with tempfile.NamedTemporaryFile(suffix=f'.{ext}', delete=False) as f:
                f.write(audio_bytes)
                tmp_path = f.name

            boundary = '----FormBoundary7MA4YWxkTrZu0gW'
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
                print(f"[transcribe] success, text={text[:80]}")

        except urllib.error.HTTPError as e:
            err_body = e.read().decode('utf-8')
            print(f"[transcribe] OpenAI HTTP error {e.code}: {err_body[:300]}")
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'text': '', 'audio_url': audio_url, 'error': err_body[:200]})}
        except Exception as e:
            print(f"[transcribe] error: {e}")
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'text': '', 'audio_url': audio_url, 'error': str(e)})}
        finally:
            if tmp_path:
                try: os.unlink(tmp_path)
                except Exception: pass

    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'text': text, 'audio_url': audio_url})}
