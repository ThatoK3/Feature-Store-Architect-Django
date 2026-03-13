from django.urls import path
from .views import (
    LoginAPIView, LogoutAPIView,
    login_auth, choose_app, unavailable_app, noaccess_to_app,
    repository_list, log_ticket, blocked_access,
    request_password_reset, reset_password,
)

urlpatterns = [
    path('xloginapi/',              LoginAPIView.as_view(),     name='login-api'),
    path('xlogoutapi/',             LogoutAPIView.as_view(),    name='logout-api'),
    path('auth',                    login_auth,                 name='auth-page'),
    path('',                        choose_app,                 name='choose-app-page'),
    path('unavailableapp',          unavailable_app,            name='unavailable-app-page'),
    path('noaccessapp',             noaccess_to_app,            name='no-access-to-app-page'),
    path('api/repositories',        repository_list,            name='repository-list'),
    path('logaticket',              log_ticket,                 name='log-a-ticket'),
    path('blocked-access',          blocked_access,             name='access-denied'),
    path('password_reset_request/', request_password_reset,     name='password-reset-request'),
    path('reset_password',          reset_password,             name='password-reset'),
]
