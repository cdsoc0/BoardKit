from django.test import TestCase, Client
from .models import Game, Profile
from django.contrib.auth.models import User

BOB_PASSWORD = "swordfish"
ALICE_PASSWORD = "aquaman1"

def create_dummy_users():
    """Util function for test cases involving auth"""
    bob = User.objects.create_user("bob", "bob@mallory.com", BOB_PASSWORD)
    alice = User.objects.create_user("alice", "alice@example.com", ALICE_PASSWORD)
    return bob, alice

class GamePermissionsTestCase(TestCase):
    def setUp(self):
        bob, alice = create_dummy_users()
        # Dummy games, only 'published' matters for this case.
        Game.objects.create(
            creator=alice,
            name="Alice's public game",
            description="aaa",
            format_version=4,
            board="{}",
            rules="{}",
            players="{}",
            published=True 
        )
        Game.objects.create(
            creator=alice,
            name="Alice's private game",
            description="bbb",
            format_version=4,
            board="{}",
            rules="{}",
            players="{}",
            published=False
        )

    def test_can_alice_read_own(self):
        """Alice should always be able to read her own games."""
        client = Client()
        client.login(username="alice", password=ALICE_PASSWORD)
        response = client.get("/api/games/1/")
        self.assertEqual(response.status_code, 200)
        response = client.get("/api/games/2/")
        self.assertEqual(response.status_code, 200)

    def test_can_bob_read_public(self):
        """Anyone should be able to read published games."""
        client = Client()
        client.login(username="bob", password=BOB_PASSWORD)
        response = client.get("/api/games/1/")
        self.assertEqual(response.status_code, 200)
    
    def test_only_creator_can_read_unpublished(self):
        """Only Alice should be able to access her unpublished games."""
        client = Client()
        client.login(username="bob", password=BOB_PASSWORD)
        response = client.get("/api/games/2/")
        self.assertEqual(response.status_code, 404)

