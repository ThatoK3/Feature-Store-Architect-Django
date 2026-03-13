from django.contrib import admin
from django.contrib.auth.models import Group
from .models import Repository, PasswordResetRequest


@admin.register(Repository)
class RepositoryAdmin(admin.ModelAdmin):
    list_display  = ('name', 'access_group', 'default_owner', 'created_at')
    list_filter   = ('access_group',)
    search_fields = ('name', 'description')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        (None, {
            'fields': ('name', 'description', 'url', 'default_owner')
        }),
        ('Access Control', {
            'fields': ('access_group',),
            'description': (
                'Assign a Group to restrict access. '
                'Leave blank to allow all authenticated users.'
            ),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )


@admin.register(PasswordResetRequest)
class PasswordResetRequestAdmin(admin.ModelAdmin):
    list_display  = ('username', 'email', 'request_date', 'password_change_date')
    search_fields = ('username', 'email')
    readonly_fields = (
        'salt', 'signed_token', 'url',
        'request_date', 'password_change_date',
    )
