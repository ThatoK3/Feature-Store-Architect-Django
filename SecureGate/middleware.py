from django.shortcuts import redirect
from django.urls import reverse

# Paths that unauthenticated users can access
PUBLIC_PATHS = {
    '/auth',
    '/xloginapi/',
    '/blocked-access',
    '/create_ticket/',
    '/password_reset_request/',
    '/reset_password',
}


class AuthenticationRedirectMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not request.user.is_authenticated and request.path not in PUBLIC_PATHS:
            return redirect(reverse('auth-page'))
        return self.get_response(request)
