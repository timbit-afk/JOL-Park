from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404, redirect, render

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import (
    ParkingLocation,
    ParkingSpot,
    Booking
)

from .serializers import (
    ParkingLocationSerializer,
    ParkingSpotSerializer
)


# ==========================================
# PAGES
# ==========================================

def home(request):
    return render(request, "index.html")


def landing(request):
    return render(request, "landing.html")


# ==========================================
# REGISTER
# ==========================================

def register_view(request):

    if request.user.is_authenticated:
        return redirect("home")

    if request.method == "POST":

        username = request.POST.get(
            "username",
            ""
        ).strip()

        password = request.POST.get(
            "password",
            ""
        )

        password2 = request.POST.get(
            "password2",
            ""
        )

        if not username or not password or not password2:

            messages.error(
                request,
                "Заполните все поля."
            )

            return render(
                request,
                "register.html"
            )

        if password != password2:

            messages.error(
                request,
                "Пароли не совпадают."
            )

            return render(
                request,
                "register.html"
            )

        if len(password) < 6:

            messages.error(
                request,
                "Пароль должен содержать минимум 6 символов."
            )

            return render(
                request,
                "register.html"
            )

        if User.objects.filter(
            username=username
        ).exists():

            messages.error(
                request,
                "Пользователь с таким именем уже существует."
            )

            return render(
                request,
                "register.html"
            )

        user = User.objects.create_user(
            username=username,
            password=password
        )

        login(request, user)

        return redirect("home")

    return render(
        request,
        "register.html"
    )


# ==========================================
# LOGIN
# ==========================================

def login_view(request):

    if request.user.is_authenticated:
        return redirect("home")

    if request.method == "POST":

        username = request.POST.get(
            "username",
            ""
        ).strip()

        password = request.POST.get(
            "password",
            ""
        )

        user = authenticate(
            request,
            username=username,
            password=password
        )

        if user is not None:

            login(request, user)

            return redirect("home")

        messages.error(
            request,
            "Неверное имя пользователя или пароль."
        )

    return render(
        request,
        "login.html"
    )


# ==========================================
# LOGOUT
# ==========================================

def logout_view(request):

    logout(request)

    return redirect("home")


# ==========================================
# LOCATIONS
# ==========================================

@api_view(["GET"])
@permission_classes([AllowAny])
def locations(request):

    parking_locations = (
        ParkingLocation.objects.all()
    )

    serializer = ParkingLocationSerializer(
        parking_locations,
        many=True
    )

    return Response(
        serializer.data
    )


# ==========================================
# SPOTS
# ==========================================

@api_view(["GET"])
@permission_classes([AllowAny])
def location_spots(
    request,
    location_id
):

    location = get_object_or_404(
        ParkingLocation,
        id=location_id
    )

    spots = location.spots.all()

    serializer = ParkingSpotSerializer(
        spots,
        many=True
    )

    return Response(
        serializer.data
    )


# ==========================================
# BOOK SPOT
# ==========================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def book_spot(
    request,
    spot_id
):

    spot = get_object_or_404(
        ParkingSpot,
        id=spot_id
    )

    # Проверяем занятость
    if spot.is_occupied:

        return Response(
            {
                "success": False,
                "message": "Это место уже занято."
            },
            status=400
        )

    # Проверяем, есть ли у пользователя
    # уже активная бронь
    existing_booking = Booking.objects.filter(
        user=request.user,
        status="active"
    ).first()

    if existing_booking:

        return Response(
            {
                "success": False,
                "message": (
                    "У вас уже есть активное "
                    "бронирование места "
                    f"{existing_booking.spot.number}."
                )
            },
            status=400
        )

    # Создаем бронь
    booking = Booking.objects.create(
        user=request.user,
        spot=spot,
        status="active"
    )

    # Занимаем место
    spot.is_occupied = True
    spot.save(
        update_fields=["is_occupied"]
    )

    return Response(
        {
            "success": True,
            "message": (
                f"Место {spot.number} "
                "успешно забронировано!"
            ),
            "booking_id": booking.id,
            "spot": ParkingSpotSerializer(
                spot
            ).data
        }
    )


# ==========================================
# MY BOOKINGS
# ==========================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_bookings(request):

    bookings = Booking.objects.filter(
        user=request.user,
        status="active"
    ).select_related(
        "spot",
        "spot__location"
    )

    result = []

    for booking in bookings:

        result.append(
            {
                "id": booking.id,

                "status": booking.status,

                "created_at":
                    booking.created_at,

                "spot": {
                    "id":
                        booking.spot.id,

                    "number":
                        booking.spot.number,

                    "location":
                        booking.spot.location.id
                },

                "spot_number":
                    booking.spot.number,

                "location_id":
                    booking.spot.location.id
            }
        )

    return Response(result)


# ==========================================
# CANCEL BOOKING
# ==========================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cancel_booking(
    request,
    booking_id
):

    booking = get_object_or_404(
        Booking,
        id=booking_id,
        user=request.user
    )

    if booking.status == "cancelled":

        return Response(
            {
                "success": False,
                "message": "Бронирование уже отменено."
            },
            status=400
        )

    spot = booking.spot

    # Отменяем бронь
    booking.status = "cancelled"
    booking.save(
        update_fields=["status"]
    )

    # Освобождаем место
    spot.is_occupied = False
    spot.save(
        update_fields=["is_occupied"]
    )

    return Response(
        {
            "success": True,
            "message": (
                f"Бронирование места "
                f"{spot.number} отменено."
            ),
            "spot_id": spot.id
        }
    )