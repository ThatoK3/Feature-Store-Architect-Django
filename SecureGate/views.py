from django.contrib.auth import login, logout
from django.http import HttpResponseRedirect, JsonResponse
from django.views.decorators.csrf import csrf_protect
from django.utils.decorators import method_decorator
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.shortcuts import render
from django.contrib.auth.models import update_last_login
from django.utils import timezone
from django.core.signing import Signer, BadSignature

from axes.decorators import axes_dispatch
from django_ratelimit.decorators import ratelimit

from TicketManager.utils import generate_ticket_reference
from TicketManager.models import Ticket

from .models import Repository, PasswordResetRequest
from .serializers import RepositorySerializer, LoginSerializer


# ─────────────────────────────────────────
# Pages
# ─────────────────────────────────────────

@ratelimit(key='user_or_ip', rate='10/5m')
def blocked_access(request):
    return render(request, 'SecureGate/lockout.html', {'page_title': 'Access Denied'})


@axes_dispatch
def login_auth(request):
    return render(request, 'SecureGate/login.html', {'page_title': 'Sign In'})


def choose_app(request):
    if not request.user.is_authenticated:
        return HttpResponseRedirect('/auth')
    username = request.user.username.upper() if request.user.username else ''
    return render(request, 'SecureGate/chooseapp.html', {
        'page_title': 'Choose Repository',
        'username':   username,
    })


@login_required
def unavailable_app(request):
    return render(request, 'SecureGate/appunavailable.html', {'page_title': 'App Unavailable'})


@login_required
def noaccess_to_app(request):
    return render(request, 'SecureGate/noaccess.html', {'page_title': 'No Access'})


@ratelimit(key='user_or_ip', rate='10/5m')
def log_ticket(request):
    username   = request.user.username.title() if request.user.is_authenticated else ''
    back_url   = '/' if username else '/auth'
    back_label = 'Back to repositories' if username else 'Back to login'
    return render(request, 'SecureGate/logaticket.html', {
        'page_title': 'Submit a Request',
        'username':   username,
        'back_url':   back_url,
        'back_label': back_label,
    })


# ─────────────────────────────────────────
# API
# ─────────────────────────────────────────

class LoginAPIView(APIView):
    @method_decorator(csrf_protect)
    def post(self, request, *args, **kwargs):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        login(request, user)
        update_last_login(None, user)
        return Response({'status': status.HTTP_200_OK, 'message': 'Login successful'})


class LogoutAPIView(APIView):
    def post(self, request, *args, **kwargs):
        logout(request)
        return JsonResponse({'status': status.HTTP_200_OK, 'message': 'Logout successful'})


@login_required
def repository_list(request):
    repos      = Repository.objects.select_related('access_group').all()
    accessible = [r for r in repos if r.is_accessible_by(request.user)]
    serializer = RepositorySerializer(accessible, many=True, context={'request': request})
    return JsonResponse(serializer.data, safe=False)


# ─────────────────────────────────────────
# Password reset
# ─────────────────────────────────────────

@ratelimit(key='user_or_ip', rate='2/5m')
def request_password_reset(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    username = request.POST.get('username')
    email    = request.POST.get('email')

    try:
        user = User.objects.get(username=username, email=email)
    except User.DoesNotExist:
        return JsonResponse({'error': 'Invalid username or email'}, status=400)

    ticket_reference = generate_ticket_reference('request')
    ticket = Ticket.objects.create(
        ticket_reference=ticket_reference,
        requester=user,
        description='Password reset request',
        ticket_type='request',
        status='IN_PROGRESS',
        open_date=timezone.now(),
    )

    reset_request = PasswordResetRequest.objects.create(
        username=username,
        email=email,
        request_date=timezone.now(),
        ticket=ticket,
    )

    return JsonResponse({
        'status': 200,
        'message': f'Password reset request logged under reference: {reset_request.ticket}',
    })


@ratelimit(key='user_or_ip', rate='10/5m')
def reset_password(request):
    if request.method == 'GET':
        token = request.GET.get('token')
        if not token:
            return JsonResponse({'error': 'Token is missing.'}, status=400)

        reset_req = PasswordResetRequest.objects.filter(signed_token=token).first()
        if not reset_req:
            return JsonResponse({'error': 'Invalid token.'}, status=400)

        try:
            Signer(salt=reset_req.salt).unsign(token)
        except BadSignature:
            return JsonResponse({'error': 'Invalid token.'}, status=400)

        return render(request, 'SecureGate/passwordreset.html', {'page_title': 'Reset Password'})

    if request.method == 'POST':
        token             = request.POST.get('token')
        provided_username = request.POST.get('username')
        new_password      = request.POST.get('password')
        confirm_password  = request.POST.get('confirm_password')

        if not new_password or not confirm_password:
            return JsonResponse({'error': 'Both password fields are required.'}, status=400)
        if new_password != confirm_password:
            return JsonResponse({'error': 'Passwords do not match.'}, status=400)
        if not token:
            return JsonResponse({'error': 'Token is missing.'}, status=400)

        reset_req = PasswordResetRequest.objects.filter(signed_token=token).first()
        if not reset_req:
            return JsonResponse({'error': 'Invalid token.'}, status=400)

        try:
            username = Signer(salt=reset_req.salt).unsign(token)
        except BadSignature:
            return JsonResponse({'error': 'Invalid token.'}, status=400)

        if username != provided_username:
            return JsonResponse({'error': 'Username does not match token.'}, status=400)

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return JsonResponse({'error': 'User not found.'}, status=400)

        user.set_password(new_password)
        user.save()

        reset_req.signed_token         = ''
        reset_req.salt                 = ''
        reset_req.password_change_date = timezone.now()
        reset_req.url                  = '__already_used__'
        reset_req.save()

        linked_ticket = Ticket.objects.filter(ticket_reference=reset_req.ticket).first()
        if linked_ticket:
            linked_ticket.status        = 'RESOLVED'
            linked_ticket.resolve_date  = timezone.now()
            linked_ticket.task_comments = f'Password changed by {user.username} via reset.'
            linked_ticket.save()

        return JsonResponse({'status': 200, 'message': 'Password reset successfully'})

    return JsonResponse({'error': 'Method not allowed'}, status=405)
