from django.urls import path

from . import views

app_name = "frontend"
urlpatterns = [
    path("", views.IndexView.as_view(), name="index"),
    path("editor/", views.EditorView.as_view(), name="editor"),
    path("player/", views.PlayerView.as_view(), name="player"),
    path("browse/", views.BrowseView.as_view(), name="browse"),
    path("auth/signup/", views.sign_up, name="sign_up"),
]