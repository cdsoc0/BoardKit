from django.contrib.auth.models import Group, User
from .models import Profile, Category, Game
from rest_framework import serializers

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'date_joined', 'is_staff']

class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ["id", "user", "bio"]

class GameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Game
        fields = ["id", "creator_id", "name", "description", "creation_date", "modification_date", "published", "board", "categories"]
