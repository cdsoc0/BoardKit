from rest_framework import pagination

class LargeObjectsPageination(pagination.CursorPagination):
    ordering = "-creation_date"

