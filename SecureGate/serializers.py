from rest_framework import serializers
from django.contrib.auth import authenticate
from django.utils.translation import gettext_lazy as _
from .models import Repository


class RepositorySerializer(serializers.ModelSerializer):
    has_access = serializers.SerializerMethodField()

    class Meta:
        model  = Repository
        fields = ['id', 'name', 'description', 'url', 'default_owner', 'created_at', 'has_access']

    def get_has_access(self, obj):
        request = self.context.get('request')
        return obj.is_accessible_by(request.user) if request else False


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=255, required=False)
    email    = serializers.EmailField(max_length=255, required=False)
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, data):
        username = data.get('username')
        email    = data.get('email')
        password = data.get('password')

        if not (username or email) or not password:
            raise serializers.ValidationError(
                _('Provide username or email and password.'), code='authorization'
            )

        user = authenticate(
            request=self.context.get('request'),
            username=username, email=email, password=password
        )
        if not user:
            raise serializers.ValidationError(
                _('Invalid credentials.'), code='authorization'
            )

        data['user'] = user
        return data
