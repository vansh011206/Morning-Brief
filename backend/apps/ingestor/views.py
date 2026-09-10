from rest_framework import generics, permissions
from .models import RawItem
from .serializers import RawItemSerializer


class RawItemListView(generics.ListAPIView):
    """
    List raw ingested items for current authenticated user.
    """
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = RawItemSerializer

    def get_queryset(self):
        return RawItem.objects.filter(connection__user=self.request.user)


class RawItemDetailView(generics.RetrieveAPIView):
    """
    Retrieve specific raw item details.
    """
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = RawItemSerializer

    def get_queryset(self):
        return RawItem.objects.filter(connection__user=self.request.user)
