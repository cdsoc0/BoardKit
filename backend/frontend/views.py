from django.shortcuts import render
from django.views.generic import TemplateView
from django.contrib.auth.forms import *
from django.contrib.auth import authenticate, login
from .forms import *
from boardkitbackend.api.models import Category, Game

class IndexView(TemplateView):
    template_name = 'frontend/index.html'
    extra_context = None

    def setup(self, request, *args, **kwargs):
        super().setup(request, *args, **kwargs)
        # Get the metadata of the 5 most recently published games.
        self.extra_context = {'new_games': Game.objects.defer('board').filter(published=True).order_by('-creation_date')[:5]}

class EditorView(TemplateView):
    template_name = 'frontend/editor.html'
    extra_context = {'categories': Category.objects.all()}

class PlayerView(TemplateView):
    template_name = 'frontend/player.html'

def sign_up(request):
    if request.method == 'POST':
        form = RegistrationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect('/')
    else:
        form = RegistrationForm()
    return render(request, 'registration/signup.html', {'form':form})
