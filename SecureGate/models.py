from django.db import models
from django.contrib.auth.models import User, Group
import secrets
from django.utils import timezone
from django.core.signing import Signer


class Repository(models.Model):
    """
    A FeastArchitect feature store repository.
    Access is controlled by membership in access_group.
    Leave access_group blank to allow all authenticated users.
    """
    name          = models.CharField(max_length=100)
    description   = models.TextField(blank=True)
    url           = models.URLField(
        help_text="URL to open this repo in FeastArchitect (e.g. /ui/feast?repo_id=1)"
    )
    access_group  = models.ForeignKey(
        Group,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='repositories',
        help_text="Members of this group can open the repo. Leave blank = visible to all authenticated users."
    )
    default_owner = models.CharField(max_length=100, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'repositories'
        ordering = ['name']

    def __str__(self):
        return self.name

    def is_accessible_by(self, user):
        if not user or not user.is_authenticated:
            return False
        if self.access_group is None:
            return True
        return user.groups.filter(pk=self.access_group_id).exists()


def generate_salt():
    return secrets.token_urlsafe(32)


class PasswordResetRequest(models.Model):
    """Stores password reset requests linked to a support ticket."""

    username             = models.CharField(max_length=100)
    email                = models.EmailField()
    salt                 = models.CharField(max_length=50, editable=False, default=generate_salt)
    signed_token         = models.CharField(max_length=200, null=True, blank=True)
    request_date         = models.DateTimeField(default=timezone.now)
    password_change_date = models.DateTimeField(null=True, blank=True)
    ticket               = models.ForeignKey(
        'TicketManager.Ticket',
        on_delete=models.CASCADE,
        related_name='password_reset_requests'
    )
    url = models.CharField(max_length=200, null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.pk:
            signer = Signer(salt=self.salt)
            self.signed_token = signer.sign(self.username)
            self.url = f'http://localhost:8001/reset_password?token={self.signed_token}'
        super().save(*args, **kwargs)

    def __str__(self):
        return f"PasswordResetRequest({self.username})"
