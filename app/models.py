from django.db import models
from django.contrib.auth.models import User


class ParkingLocation(models.Model):
    name = models.CharField(max_length=100)
    address = models.CharField(max_length=255)
    latitude = models.FloatField()
    longitude = models.FloatField()

    def __str__(self):
        return self.name


class ParkingSpot(models.Model):
    location = models.ForeignKey(
        ParkingLocation,
        on_delete=models.CASCADE,
        related_name="spots"
    )
    number = models.CharField(max_length=20)
    is_occupied = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.location.name} — {self.number}"


class Booking(models.Model):
    STATUS_CHOICES = [
        ("active", "Активно"),
        ("cancelled", "Отменено"),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="bookings"
    )

    spot = models.ForeignKey(
        ParkingSpot,
        on_delete=models.CASCADE,
        related_name="bookings"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="active"
    )

    def __str__(self):
        return (
            f"{self.user.username} — "
            f"{self.spot.number} — "
            f"{self.status}"
        )