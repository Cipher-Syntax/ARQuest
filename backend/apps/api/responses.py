from rest_framework.response import Response


def success_response(data=None, status_code=200):
    return Response({
        'success': True,
        'data': data,
        'error': None
    }, status=status_code)


def error_response(code, message, status_code=400, details=None):
    error_data = {
        'code': code,
        'message': message
    }
    if details:
        error_data['details'] = details
    
    return Response({
        'success': False,
        'data': None,
        'error': error_data
    }, status=status_code)
