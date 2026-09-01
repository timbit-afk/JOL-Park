from django.urls import path

from . import views


urlpatterns = [

    # =========================
    # PAGES
    # =========================

    path(
        "",
        views.home,
        name="home"
    ),

    path(
        "landing/",
        views.landing,
        name="landing"
    ),

    path(
        "login/",
        views.login_view,
        name="login"
    ),

    path(
        "register/",
        views.register_view,
        name="register"
    ),

    path(
        "logout/",
        views.logout_view,
        name="logout"
    ),


    # =========================
    # PARKING LOCATIONS
    # =========================

    path(
        "api/locations/",
        views.locations,
        name="locations"
    ),

    path(
        "api/locations/<int:location_id>/spots/",
        views.location_spots,
        name="location-spots"
    ),


    # =========================
    # BOOKING
    # =========================

    path(
        "api/spots/<int:spot_id>/book/",
        views.book_spot,
        name="book-spot"
    ),

    path(
        "api/bookings/my/",
        views.my_bookings,
        name="my-bookings"
    ),

    path(
        "api/bookings/<int:booking_id>/cancel/",
        views.cancel_booking,
        name="cancel-booking"
    ),
]