import types
import sys
from unittest.mock import MagicMock

# Create minimal flask stub
flask_stub = types.ModuleType('flask')
class Flask:
    def __init__(self, name):
        self.name = name
    def route(self, *args, **kwargs):
        def decorator(func):
            return func
        return decorator
    def run(self, *args, **kwargs):
        pass
flask_stub.Flask = Flask
flask_stub.request = types.SimpleNamespace(json=None)
flask_stub.jsonify = lambda obj: obj
sys.modules['flask'] = flask_stub

# Stub for flask_cors
flask_cors_stub = types.ModuleType('flask_cors')
flask_cors_stub.CORS = lambda app: None
sys.modules['flask_cors'] = flask_cors_stub

import public.send_email_server as ses


def test_send_claim_email_success(monkeypatch):
    flask_stub.request.json = {
        'contractor': 'Cont',
        'contractNumber': '1',
        'contractDate': '2021-01-01',
        'amountRub': '10',
        'amountForeign': '20',
        'currency': 'USD',
        'requirement': 'req',
        'documentsLink': 'link'
    }

    mock_context = MagicMock()
    mock_server = mock_context.__enter__.return_value
    monkeypatch.setattr(ses.smtplib, 'SMTP_SSL', lambda *args, **kwargs: mock_context)

    result = ses.send_claim_email()
    assert result == {'success': True}
    mock_server.login.assert_called_with(ses.SMTP_USER, ses.SMTP_PASSWORD)
    mock_server.sendmail.assert_called_with(ses.SMTP_USER, ses.TO_EMAIL, mock_server.sendmail.call_args.args[2])


def test_send_claim_email_no_data():
    flask_stub.request.json = None
    result, status = ses.send_claim_email()
    assert status == 400
    assert result == {'error': 'No data'}
