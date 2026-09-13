from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from .models import ParkingLocation, ParkingSpot, Booking


class JOLParkTests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            password="testpassword123"
        )

        self.location = ParkingLocation.objects.create(
            name="Test Parking",
            address="Test Address",
            latitude=42.8746,
            longitude=74.5698
        )

        self.spot = ParkingSpot.objects.create(
            location=self.location,
            number="A1",
            is_occupied=False
        )

    def test_locations_api(self):
        response = self.client.get("/api/locations/")

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK
        )

        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]["name"],
            "Test Parking"
        )

    def test_location_spots_api(self):
        response = self.client.get(
            f"/api/locations/{self.location.id}/spots/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK
        )

        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]["number"],
            "A1"
        )

    def test_location_spots_for_nonexistent_location(self):
        response = self.client.get(
            "/api/locations/99999/spots/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND
        )

    def test_unauthenticated_user_cannot_book(self):
        response = self.client.post(
            f"/api/spots/{self.spot.id}/book/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN
        )

    def test_unauthenticated_user_cannot_view_bookings(self):
        response = self.client.get(
            "/api/bookings/my/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN
        )

    def test_unauthenticated_user_cannot_cancel_booking(self):
        response = self.client.post(
            "/api/bookings/99999/cancel/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN
        )

    def test_authenticated_user_can_book_free_spot(self):
        self.client.force_authenticate(
            user=self.user
        )

        response = self.client.post(
            f"/api/spots/{self.spot.id}/book/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK
        )

        self.assertTrue(
            response.data["success"]
        )

        self.assertEqual(
            Booking.objects.count(),
            1
        )

        booking = Booking.objects.first()

        self.assertEqual(
            booking.user,
            self.user
        )

        self.assertEqual(
            booking.spot,
            self.spot
        )

        self.assertEqual(
            booking.status,
            "active"
        )

        self.spot.refresh_from_db()

        self.assertTrue(
            self.spot.is_occupied
        )

    def test_cannot_book_occupied_spot(self):
        self.spot.is_occupied = True
        self.spot.save()

        self.client.force_authenticate(
            user=self.user
        )

        response = self.client.post(
            f"/api/spots/{self.spot.id}/book/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST
        )

        self.assertFalse(
            response.data["success"]
        )

        self.assertEqual(
            Booking.objects.count(),
            0
        )

    def test_user_cannot_create_second_active_booking(self):
        self.client.force_authenticate(
            user=self.user
        )

        first_response = self.client.post(
            f"/api/spots/{self.spot.id}/book/"
        )

        self.assertEqual(
            first_response.status_code,
            status.HTTP_200_OK
        )

        second_spot = ParkingSpot.objects.create(
            location=self.location,
            number="A2",
            is_occupied=False
        )

        second_response = self.client.post(
            f"/api/spots/{second_spot.id}/book/"
        )

        self.assertEqual(
            second_response.status_code,
            status.HTTP_400_BAD_REQUEST
        )

        self.assertEqual(
            Booking.objects.count(),
            1
        )

    def test_my_bookings_returns_active_booking(self):
        self.client.force_authenticate(
            user=self.user
        )

        booking = Booking.objects.create(
            user=self.user,
            spot=self.spot,
            status="active"
        )

        response = self.client.get(
            "/api/bookings/my/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK
        )

        self.assertEqual(
            len(response.data),
            1
        )

        self.assertEqual(
            response.data[0]["id"],
            booking.id
        )

        self.assertEqual(
            response.data[0]["spot_number"],
            "A1"
        )

        self.assertEqual(
            response.data[0]["location_id"],
            self.location.id
        )

    def test_my_bookings_does_not_return_cancelled_booking(self):
        self.client.force_authenticate(
            user=self.user
        )

        Booking.objects.create(
            user=self.user,
            spot=self.spot,
            status="cancelled"
        )

        response = self.client.get(
            "/api/bookings/my/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK
        )

        self.assertEqual(
            len(response.data),
            0
        )

    def test_user_can_cancel_booking(self):
        self.client.force_authenticate(
            user=self.user
        )

        booking = Booking.objects.create(
            user=self.user,
            spot=self.spot,
            status="active"
        )

        self.spot.is_occupied = True
        self.spot.save()

        response = self.client.post(
            f"/api/bookings/{booking.id}/cancel/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK
        )

        self.assertTrue(
            response.data["success"]
        )

        booking.refresh_from_db()
        self.spot.refresh_from_db()

        self.assertEqual(
            booking.status,
            "cancelled"
        )

        self.assertFalse(
            self.spot.is_occupied
        )

    def test_cannot_cancel_already_cancelled_booking(self):
        self.client.force_authenticate(
            user=self.user
        )

        booking = Booking.objects.create(
            user=self.user,
            spot=self.spot,
            status="cancelled"
        )

        response = self.client.post(
            f"/api/bookings/{booking.id}/cancel/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST
        )

    def test_user_cannot_cancel_another_users_booking(self):
        another_user = User.objects.create_user(
            username="anotheruser",
            password="password123"
        )

        booking = Booking.objects.create(
            user=another_user,
            spot=self.spot,
            status="active"
        )

        self.client.force_authenticate(
            user=self.user
        )

        response = self.client.post(
            f"/api/bookings/{booking.id}/cancel/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND
        )