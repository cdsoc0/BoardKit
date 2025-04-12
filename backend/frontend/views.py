from django.shortcuts import render
from django.views.generic import TemplateView
from django.contrib.auth.forms import *
from django.contrib.auth import authenticate, login
from .forms import *

class IndexView(TemplateView):
    template_name = 'frontend/index.html'

class EditorView(TemplateView):
    template_name = 'frontend/editor.html'

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
