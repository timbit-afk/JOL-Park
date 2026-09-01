from django.contrib import admin

from .models import ParkingLocation, ParkingSpot


@admin.register(ParkingLocation)
class ParkingLocationAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "address",
        "latitude",
        "longitude",
    )


@admin.register(ParkingSpot)
class ParkingSpotAdmin(admin.ModelAdmin):
    list_display = (
        "number",
        "location",
        "is_occupied",
    )

    list_filter = (
        "is_occupied",
        "location",
    )