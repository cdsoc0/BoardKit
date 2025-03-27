from rest_framework import permissions

class IsCreatorOrReadOnlyIfPublic(permissions.BasePermission):
    """
    Custom permission that makes it so that only the creator of an object can edit.
    """

    def has_object_permission(self, request, view, obj):
        # Readable by anyone if public.
        if (request.method in permissions.SAFE_METHODS) and obj.published:
            return True

        # But creator can do anything.
        return obj.creator == request.user

class IsOwnProfileOrReadOnlyIfPublic(permissions.BasePermission):
    """
    Custom permission that makes it so that a user can only edit their own profile.
    """

    def has_object_permission(self, request, view, obj):
        # Readable by anyone if public.
        if (request.method in permissions.SAFE_METHODS) and obj.public:
            return True

        # Only the user themselves can edit.
        return obj.user == request.user