from django.db import models
from django.contrib.auth.models import User
from django.dispatch import receiver
from django.db.models.signals import post_save

# Create your models here.
class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE) # Doesn't make sense to have a profile without an account.
    bio = models.TextField(max_length=500, blank=True)
    public = models.BooleanField(default=True)

class Category(models.Model):
    name = models.CharField(max_length=20)

class Game(models.Model):
    creator = models.ForeignKey(User, 
                                related_name="games",
                                on_delete=models.CASCADE) # User's games should be deleted upon their account being
                                                          # deleted.
    name = models.CharField(max_length=50)
    description = models.CharField(max_length=500)
    creation_date = models.DateTimeField(auto_now_add=True, editable=False)
    modification_date = models.DateTimeField(auto_now=True)
    published = models.BooleanField(default=False)
    format_version = models.IntegerField(default=4)
    board = models.JSONField()
    rules = models.JSONField()
    players = models.JSONField()
    categories = models.ManyToManyField(Category, blank=True, related_name="games_in_category")

@receiver(post_save, sender=User)
def create_profile_on_make_account(sender, instance, created, **kwargs):
    if created:
        new_profile = Profile(user=instance)
        new_profile.save()