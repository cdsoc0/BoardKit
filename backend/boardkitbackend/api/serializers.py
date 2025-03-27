from django.contrib.auth.models import Group, User
from .models import Profile, Category, Game
from rest_framework import serializers

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'date_joined', 'is_staff']

class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    date_joined = serializers.DateTimeField(source="user.date_joined", read_only=True)
    is_staff = serializers.BooleanField(source="user.is_staff", read_only=True)
    class Meta:
        model = Profile
        fields = ["id", "username", "bio", "date_joined", "is_staff", "public"]

class GameSerializer(serializers.ModelSerializer):
    creator_id = serializers.ReadOnlyField(source='creator.id')
    class Meta:
        model = Game
        fields = ["id", "creator_id", "name", "description", "creation_date", "modification_date", "published", "board", "categories"]
    
    def get_fields(self, *args, **kwargs):
        # Exclude board from multi-object listings.
        fields = super().get_fields(*args, **kwargs)
        request = self.context.get('request')
        if request is not None and not request.parser_context.get('kwargs') and request.method == "GET":
            fields.pop('board', None)
        return fields

class CategorySerializer(serializers.ModelSerializer):
    games = serializers.PrimaryKeyRelatedField(many=True, read_only=True, source="games_in_category")
    class Meta:
        model = Category
        fields = ["id", "name", "games"]
