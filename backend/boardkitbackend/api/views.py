from django.shortcuts import render
from django.contrib.auth.models import Group, User
from django.db.models import Q
from rest_framework import permissions, viewsets, exceptions, filters

from .models import Profile, Category, Game
from .permissions import IsCreatorOrReadOnlyIfPublic, IsOwnProfileOrReadOnlyIfPublic
from .pageination import LargeObjectsPageination
from boardkitbackend.api.serializers import UserSerializer, ProfileSerializer, GameSerializer, CategorySerializer

# Create your views here.
class UserViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows users to be viewed or edited.
    """
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [permissions.DjangoModelPermissionsOrAnonReadOnly]

class ProfileViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows user profiles to be viewed or edited.
    """
    queryset = Profile.objects.all().order_by('id')
    serializer_class = ProfileSerializer
    permission_classes = [IsOwnProfileOrReadOnlyIfPublic]
    http_method_names = ["get", "head", "put", "options"]

    def list(self, request):
        raise exceptions.PermissionDenied("You may not list all users.")

class GameViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows games to be viewed or edited.
    """
    queryset = Game.objects.all().order_by('-creation_date')
    serializer_class = GameSerializer
    pagination_class = LargeObjectsPageination
    permission_classes = [IsCreatorOrReadOnlyIfPublic]
    filter_backends = [filters.SearchFilter]
    filterset_fields = ['name', 'description']

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)

    def get_queryset(self):
        queryset = self.queryset
        user = self.request.user
        if user.is_authenticated:
            filtered_qs = queryset.filter(Q(creator=user) | Q(published=True))
        else:
            filtered_qs = queryset.filter(published=True)
        return filtered_qs

class CategoryViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows querying categories.
    """
    queryset = Category.objects.all().order_by('id')
    serializer_class = CategorySerializer
    permission_classes = [permissions.DjangoModelPermissionsOrAnonReadOnly]
