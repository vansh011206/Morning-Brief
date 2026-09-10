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
        qs = RawItem.objects.filter(user=self.request.user).select_related('connection').order_by('-received_at')
        connection_id = self.request.query_params.get('connection_id')
        if connection_id:
            qs = qs.filter(connection_id=connection_id)
        limit = self.request.query_params.get('limit')
        if limit and limit.isdigit():
            return qs[:int(limit)]
        return qs[:100]


class RawItemDetailView(generics.RetrieveAPIView):
    """
    Retrieve specific raw item details.
    """
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = RawItemSerializer

    def get_queryset(self):
        return RawItem.objects.filter(user=self.request.user).select_related('connection')
