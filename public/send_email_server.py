from flask import Flask, request, jsonify
import smtplib
from email.mime.text import MIMEText
from email.header import Header
import os
from flask_cors import CORS
from dotenv import load_dotenv

# Загружаем переменные окружения из .env файла
load_dotenv()

app = Flask(__name__)
CORS(app)

# Настройка логирования
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SMTP_SERVER = 'smtp.yandex.ru'
SMTP_PORT = 465
SMTP_USER = os.environ.get('YANDEX_USER')
SMTP_PASSWORD = os.environ.get('YANDEX_PASSWORD')
TO_EMAIL = os.environ.get('TO_EMAIL')

# Проверка наличия обязательных переменных окружения
if not all([SMTP_USER, SMTP_PASSWORD, TO_EMAIL]):
    raise ValueError("Необходимо установить переменные окружения: YANDEX_USER, YANDEX_PASSWORD, TO_EMAIL")

if getattr(app, 'debug', False):
    # Выводим параметры только в режиме отладки
    print(f"SMTP_USER: {SMTP_USER}")
    print(f"TO_EMAIL: {TO_EMAIL}")

@app.route('/send-claim-email', methods=['POST'])
def send_claim_email():
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'Отсутствуют данные'}), 400

        # Валидация обязательных полей
        required_fields = ['contractor', 'requirement', 'documentsLink']
        missing_fields = [field for field in required_fields if not data.get(field)]
        if missing_fields:
            return jsonify({'error': f'Отсутствуют обязательные поля: {", ".join(missing_fields)}'}), 400

        subject = 'Новая заявка на подготовку претензии'
        body = f"""
        Наименование контрагента: {data.get('contractor', 'Не указано')}
        № договора: {data.get('contractNumber', 'Не указано')}
        Дата договора: {data.get('contractDate', 'Не указано')}
        Сумма требования (руб.): {data.get('amountRub', 'Не указано')}
        Сумма требования (валюта): {data.get('amountForeign', 'Не указано')}
        Валюта: {data.get('currency', 'Не указано')}
        Требование: {data.get('requirement', 'Не указано')}
        Ссылка на документы: {data.get('documentsLink', 'Не указано')}
        """

        msg = MIMEText(body, 'plain', 'utf-8')
        msg['Subject'] = Header(subject, 'utf-8')
        msg['From'] = SMTP_USER
        msg['To'] = TO_EMAIL

        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as server:
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, TO_EMAIL, msg.as_string())
        
        app.logger.info(f'Email успешно отправлен для контрагента: {data.get("contractor")}')
        return jsonify({'success': True, 'message': 'Email успешно отправлен'})
        
    except smtplib.SMTPAuthenticationError:
        app.logger.error('Ошибка аутентификации SMTP')
        return jsonify({'error': 'Ошибка аутентификации SMTP сервера'}), 500
    except smtplib.SMTPException as e:
        app.logger.error(f'Ошибка SMTP: {e}')
        return jsonify({'error': f'Ошибка SMTP сервера: {str(e)}'}), 500
    except Exception as e:
        app.logger.error(f'Неожиданная ошибка: {e}')
        return jsonify({'error': 'Внутренняя ошибка сервера'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)