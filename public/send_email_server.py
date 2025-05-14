from flask import Flask, request, jsonify
import smtplib
from email.mime.text import MIMEText
from email.header import Header
import os
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

SMTP_SERVER = 'smtp.yandex.ru'
SMTP_PORT = 465
SMTP_USER = os.environ.get('YANDEX_USER', 'bulmitya@yandex.ru')
SMTP_PASSWORD = os.environ.get('YANDEX_PASSWORD', 'phkjbyabxtncllze')
TO_EMAIL = 'bulanov.ds@infobm.ru'

print(f"SMTP_USER: {SMTP_USER}")  # Для отладки, удалить в продакшн
print(f"TO_EMAIL: {TO_EMAIL}")  # Для отладки, удалить в продакшн

@app.route('/send-claim-email', methods=['POST'])
def send_claim_email():
    data = request.json
    if not data:
        return jsonify({'error': 'No data'}), 400

    subject = 'Новая заявка на подготовку претензии'
    body = f"""
    Наименование контрагента: {data.get('contractor')}
    № договора: {data.get('contractNumber')}
    Дата договора: {data.get('contractDate')}
    Сумма требования (руб.): {data.get('amountRub')}
    Сумма требования (валюта): {data.get('amountForeign')}
    Валюта: {data.get('currency')}
    Требование: {data.get('requirement')}
    Ссылка на документы: {data.get('documentsLink')}
    """

    msg = MIMEText(body, 'plain', 'utf-8')
    msg['Subject'] = Header(subject, 'utf-8')
    msg['From'] = SMTP_USER  # Только email, без Header
    msg['To'] = TO_EMAIL     # Только email, без Header

    try:
        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as server:
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, TO_EMAIL, msg.as_string())
        return jsonify({'success': True})
    except Exception as e:
        print('Ошибка отправки email:', e)
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)