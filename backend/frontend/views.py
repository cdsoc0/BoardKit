from django.shortcuts import render
from django.views.generic import TemplateView

class IndexView(TemplateView):
    template_name = 'frontend/index.html'

class EditorView(TemplateView):
    template_name = 'frontend/editor.html'

class PlayerView(TemplateView):
    template_name = 'frontend/player.html'
