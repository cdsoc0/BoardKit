from django.db import models
from django.contrib.auth.models import User
from django.dispatch import receiver
from django.db.models.signals import post_save

# Create your models here.
class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE) # Doesn't make sense to have a profile without an account.
    bio = models.TextField(max_length=500, blank=True)

class Category(models.Model):
    name = models.CharField(max_length=20)

class Game(models.Model):
    creator = models.ForeignKey(Profile, on_delete=models.CASCADE) # User's games should be deleted upon their account being
                                                                   # deleted.
    name = models.CharField(max_length=50)
    description = models.CharField(max_length=500)
    creation_date = models.DateTimeField()
    modification_date = models.DateTimeField()
    published = models.BooleanField(default=False)
    board = models.JSONField()
    categories = models.ManyToManyField(Category, blank=True)

@receiver(post_save, sender=User)
def create_profile_on_make_account(sender, instance, created, **kwargs):
    if created:
        new_profile = Profile(user=instance)
        new_profile.save()