from rest_framework import serializers

from .models import ParkingLocation, ParkingSpot


class ParkingSpotSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParkingSpot
        fields = [
            "id",
            "number",
            "is_occupied",
        ]


class ParkingLocationSerializer(serializers.ModelSerializer):
    available_spots = serializers.SerializerMethodField()

    class Meta:
        model = ParkingLocation
        fields = [
            "id",
            "name",
            "address",
            "latitude",
            "longitude",
            "available_spots",
        ]

    def get_available_spots(self, obj):
        return obj.spots.filter(
            is_occupied=False
        ).count()