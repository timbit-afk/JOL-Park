document.addEventListener("DOMContentLoaded", function () {
    let map = null;
    let markers = [];
    let locations = [];
    let selectedLocation = null;
    let selectedSpot = null;

    const parkingGrid = document.getElementById("parking-grid");
    const parkingModal = document.getElementById("parking-modal");
    const spotsContainer = document.getElementById("spots-container");
    const modalTitle = document.getElementById("modal-title");
    const modalAddress = document.getElementById("modal-address");
    const bookingResult = document.getElementById("booking-result");

    const isAuthenticated =
        document.body.dataset.authenticated === "true";


    // ==========================================
    // CSRF
    // ==========================================

    function getCookie(name) {
        const cookies = document.cookie.split(";");

        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();

            if (cookie.startsWith(name + "=")) {
                return decodeURIComponent(
                    cookie.substring(name.length + 1)
                );
            }
        }

        return null;
    }


    // ==========================================
    // MAP
    // ==========================================

    function initMap() {
        const mapElement = document.getElementById("map");

        if (!mapElement) {
            console.error("Элемент #map не найден.");
            return;
        }

        if (typeof L === "undefined") {
            console.error("Leaflet не подключен.");

            mapElement.innerHTML =
                '<div class="error">Не удалось загрузить карту.</div>';

            return;
        }

        map = L.map("map").setView(
            [42.8746, 74.5698],
            13
        );

        L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
                maxZoom: 19,
                attribution: "&copy; OpenStreetMap contributors"
            }
        ).addTo(map);
    }


    // ==========================================
    // LOAD LOCATIONS
    // ==========================================

    async function loadLocations() {
        if (!parkingGrid) {
            return;
        }

        parkingGrid.innerHTML =
            '<div class="loading">Загрузка парковок...</div>';

        try {
            const response = await fetch(
                "/api/locations/",
                {
                    method: "GET",
                    headers: {
                        "Accept": "application/json"
                    }
                }
            );

            if (!response.ok) {
                throw new Error(
                    "Ошибка загрузки парковок: " +
                    response.status
                );
            }

            const data = await response.json();

            if (!Array.isArray(data)) {
                throw new Error(
                    "API вернул неправильный формат данных."
                );
            }

            locations = data;

            renderLocations();
            renderMarkers();

        } catch (error) {
            console.error(error);

            parkingGrid.innerHTML =
                '<div class="error">' +
                "Не удалось загрузить парковки." +
                "<br><br>" +
                "Проверьте Django API." +
                "</div>";
        }
    }


    // ==========================================
    // RENDER LOCATIONS
    // ==========================================

    function renderLocations() {
        if (!parkingGrid) {
            return;
        }

        parkingGrid.innerHTML = "";

        if (locations.length === 0) {
            parkingGrid.innerHTML =
                '<div class="loading">' +
                "Парковки пока не добавлены." +
                "</div>";

            return;
        }

        locations.forEach(function (location) {
            const card =
                document.createElement("article");

            card.className = "parking-card";

            const available =
                Number(location.available_spots || 0);

            card.innerHTML =
                '<div class="parking-card-icon">🅿️</div>' +

                "<h3>" +
                escapeHtml(location.name) +
                "</h3>" +

                '<p class="parking-address">' +
                escapeHtml(location.address || "") +
                "</p>" +

                '<div class="parking-info">' +
                '<span class="available">' +
                available +
                " свободных мест" +
                "</span>" +
                "</div>" +

                '<button type="button" class="parking-button">' +
                "Выбрать место" +
                "</button>";

            const button =
                card.querySelector(".parking-button");

            button.addEventListener(
                "click",
                function () {
                    openParking(location);
                }
            );

            card.addEventListener(
                "mouseenter",
                function () {
                    focusLocation(location);
                }
            );

            parkingGrid.appendChild(card);
        });
    }


    // ==========================================
    // MAP MARKERS
    // ==========================================

    function renderMarkers() {
        if (!map) {
            return;
        }

        markers.forEach(function (marker) {
            map.removeLayer(marker);
        });

        markers = [];

        locations.forEach(function (location) {
            const latitude =
                Number(location.latitude);

            const longitude =
                Number(location.longitude);

            if (
                Number.isNaN(latitude) ||
                Number.isNaN(longitude)
            ) {
                return;
            }

            const available =
                Number(location.available_spots || 0);

            const marker =
                L.marker([
                    latitude,
                    longitude
                ]).addTo(map);

            marker.bindPopup(
                '<div style="min-width:190px">' +

                "<strong>" +
                escapeHtml(location.name) +
                "</strong>" +

                "<br>" +

                escapeHtml(
                    location.address || ""
                ) +

                "<br><br>" +

                "<b>" +
                available +
                "</b> свободных мест" +

                "<br><br>" +

                '<button ' +
                'type="button" ' +
                'class="map-book-button">' +
                "Выбрать место" +
                "</button>" +

                "</div>"
            );

            marker.on(
                "popupopen",
                function (event) {
                    const popup =
                        event.popup.getElement();

                    if (!popup) {
                        return;
                    }

                    const button =
                        popup.querySelector(
                            ".map-book-button"
                        );

                    if (button) {
                        button.addEventListener(
                            "click",
                            function () {
                                openParking(location);
                            }
                        );
                    }
                }
            );

            markers.push(marker);
        });
    }


    // ==========================================
    // FOCUS LOCATION
    // ==========================================

    function focusLocation(location) {
        if (!map) {
            return;
        }

        const latitude =
            Number(location.latitude);

        const longitude =
            Number(location.longitude);

        if (
            Number.isNaN(latitude) ||
            Number.isNaN(longitude)
        ) {
            return;
        }

        map.setView(
            [latitude, longitude],
            15,
            {
                animate: true
            }
        );
    }


    // ==========================================
    // OPEN PARKING
    // ==========================================

    async function openParking(location) {
        selectedLocation = location;
        selectedSpot = null;

        if (!isAuthenticated) {
            const answer = window.confirm(
                "Чтобы выбрать и забронировать парковочное место, " +
                "необходимо войти в аккаунт.\n\n" +
                "Перейти на страницу входа?"
            );

            if (answer) {
                window.location.href = "/login/";
            }

            return;
        }

        if (modalTitle) {
            modalTitle.textContent =
                location.name;
        }

        if (modalAddress) {
            modalAddress.textContent =
                location.address || "";
        }

        if (bookingResult) {
            bookingResult.innerHTML = "";
            bookingResult.classList.add("hidden");
        }

        if (parkingModal) {
            parkingModal.classList.remove("hidden");
        }

        if (spotsContainer) {
            spotsContainer.innerHTML =
                '<div class="loading">' +
                "Загрузка парковочных мест..." +
                "</div>";
        }

        await loadSpots(location.id);
    }


    // ==========================================
    // LOAD SPOTS
    // ==========================================

    async function loadSpots(locationId) {
        try {
            const response = await fetch(
                "/api/locations/" +
                locationId +
                "/spots/",
                {
                    method: "GET",
                    headers: {
                        "Accept": "application/json"
                    }
                }
            );

            if (!response.ok) {
                throw new Error(
                    "Ошибка загрузки мест: " +
                    response.status
                );
            }

            const data =
                await response.json();

            let spots = data;

            if (
                data &&
                !Array.isArray(data) &&
                Array.isArray(data.results)
            ) {
                spots = data.results;
            }

            if (!Array.isArray(spots)) {
                throw new Error(
                    "API мест вернул неправильный формат."
                );
            }

            renderSpots(spots);

        } catch (error) {
            console.error(error);

            if (spotsContainer) {
                spotsContainer.innerHTML =
                    '<div class="error">' +
                    "Не удалось загрузить парковочные места." +
                    "<br><br>" +
                    "Endpoint:" +
                    "<br>" +
                    "/api/locations/" +
                    locationId +
                    "/spots/" +
                    "</div>";
            }
        }
    }


    // ==========================================
    // RENDER SPOTS
    // ==========================================

    function renderSpots(spots) {
        if (!spotsContainer) {
            return;
        }

        spotsContainer.innerHTML = "";

        if (spots.length === 0) {
            spotsContainer.innerHTML =
                '<div class="loading">' +
                "В этой парковке пока нет мест." +
                "</div>";

            return;
        }

        const freeSpots =
            spots.filter(function (spot) {
                return !isSpotOccupied(spot);
            });

        const occupiedSpots =
            spots.filter(function (spot) {
                return isSpotOccupied(spot);
            });

        const statistics =
            document.createElement("div");

        statistics.className =
            "spots-statistics";

        statistics.innerHTML =
            "Всего: <b>" +
            spots.length +
            "</b> &nbsp; " +

            '<span style="color:#16a34a">' +
            "Свободно: <b>" +
            freeSpots.length +
            "</b>" +
            "</span>" +

            " &nbsp; " +

            '<span style="color:#dc2626">' +
            "Занято: <b>" +
            occupiedSpots.length +
            "</b>" +
            "</span>";

        spotsContainer.appendChild(
            statistics
        );

        const grid =
            document.createElement("div");

        grid.className =
            "spots-grid";

        spots.forEach(function (spot) {
            const button =
                document.createElement("button");

            button.type = "button";

            const occupied =
                isSpotOccupied(spot);

            button.className =
                occupied
                    ? "spot occupied"
                    : "spot free";

            const number =
                spot.number ||
                spot.name ||
                ("#" + spot.id);

            button.innerHTML =
                "<strong>" +
                escapeHtml(String(number)) +
                "</strong>" +

                "<small>" +
                (
                    occupied
                        ? "Занято"
                        : "Свободно"
                ) +
                "</small>";

            if (occupied) {
                button.disabled = true;
            } else {
                button.addEventListener(
                    "click",
                    function () {
                        selectSpot(
                            spot,
                            button,
                            grid
                        );
                    }
                );
            }

            grid.appendChild(button);
        });

        spotsContainer.appendChild(grid);

        /*
         * Показываем активное бронирование
         * пользователя, если API его возвращает.
         */
        if (selectedLocation) {
            loadMyBooking(selectedLocation.id);
        }
    }


    // ==========================================
    // CHECK OCCUPIED
    // ==========================================

    function isSpotOccupied(spot) {
        return (
            spot.is_occupied === true ||
            spot.is_occupied === 1 ||
            spot.is_occupied === "true" ||
            spot.status === "occupied" ||
            spot.status === "Занято"
        );
    }


    // ==========================================
    // SELECT SPOT
    // ==========================================

    function selectSpot(
        spot,
        button,
        grid
    ) {
        const oldSelected =
            grid.querySelector(
                ".spot.selected"
            );

        if (oldSelected) {
            oldSelected.classList.remove(
                "selected"
            );
        }

        button.classList.add(
            "selected"
        );

        selectedSpot = spot;

        showBookingPanel();
    }


    // ==========================================
    // BOOKING PANEL
    // ==========================================

    function showBookingPanel() {
    if (!spotsContainer || !selectedSpot) {
        console.error("Нет spotsContainer или selectedSpot");
        return;
    }

    // Удаляем старую панель
    const oldPanel = spotsContainer.querySelector(".booking-panel");

    if (oldPanel) {
        oldPanel.remove();
    }

    // Создаём новую панель
    const panel = document.createElement("div");
    panel.className = "booking-panel";

    const number =
        selectedSpot.number ||
        selectedSpot.name ||
        ("#" + selectedSpot.id);

    panel.innerHTML = `
        <div class="selected-spot-info">
            <small>Выбранное место</small>
            <strong>${escapeHtml(String(number))}</strong>
        </div>

        <button
            type="button"
            id="book-button"
            class="book-button"
        >
            Забронировать
        </button>
    `;

    const button = panel.querySelector("#book-button");

    if (!button) {
        console.error("❌ Кнопка #book-button не найдена");
        return;
    }

    button.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();

        console.log("✅ Кнопка бронирования нажата");
        console.log("📍 Парковка:", selectedLocation);
        console.log("🚗 Место:", selectedSpot);

        showConfirmation();
    });

    spotsContainer.appendChild(panel);

    console.log("✅ Панель бронирования создана");
}


    // ==========================================
    // CONFIRM BOOKING
    // ==========================================

    function showConfirmation() {
        if (
            !selectedSpot ||
            !selectedLocation
        ) {
            return;
        }

        const oldConfirmation =
            document.querySelector(
                ".confirmation-overlay"
            );

        if (oldConfirmation) {
            oldConfirmation.remove();
        }

        const number =
            selectedSpot.number ||
            selectedSpot.name ||
            ("#" + selectedSpot.id);

        const overlay =
            document.createElement("div");

        overlay.className =
            "confirmation-overlay";

        overlay.innerHTML =
            '<div class="confirmation">' +

            '<div class="confirmation-icon">' +
            "🅿️" +
            "</div>" +

            "<h3>Подтвердить бронирование?</h3>" +

            "<p>" +

            "<strong>" +
            escapeHtml(
                selectedLocation.name
            ) +
            "</strong>" +

            "<br>" +

            "Место: " +

            "<strong>" +
            escapeHtml(
                String(number)
            ) +
            "</strong>" +

            "</p>" +

            '<div class="confirmation-buttons">' +

            '<button ' +
            'type="button" ' +
            'class="cancel-button">' +
            "Отмена" +
            "</button>" +

            '<button ' +
            'type="button" ' +
            'class="confirm-button">' +
            "Подтвердить" +
            "</button>" +

            "</div>" +

            "</div>";

        const cancelButton =
            overlay.querySelector(
                ".cancel-button"
            );

        const confirmButton =
            overlay.querySelector(
                ".confirm-button"
            );

        cancelButton.addEventListener(
            "click",
            function () {
                overlay.remove();
            }
        );

        confirmButton.addEventListener(
            "click",
            async function () {
                await bookSpot(
                    selectedSpot.id,
                    confirmButton,
                    overlay
                );
            }
        );

        document.body.appendChild(
            overlay
        );
    }


    // ==========================================
    // BOOK SPOT
    // ==========================================

    async function bookSpot(
        spotId,
        button,
        confirmation
    ) {
        if (!isAuthenticated) {
            window.location.href =
                "/login/";

            return;
        }

        button.disabled = true;

        button.textContent =
            "Бронирование...";

        try {
            const csrfToken =
                getCookie("csrftoken");

            const headers = {
                "Accept":
                    "application/json",

                "Content-Type":
                    "application/json"
            };

            if (csrfToken) {
                headers["X-CSRFToken"] =
                    csrfToken;
            }

            const response =
                await fetch(
                    "/api/spots/" +
                    spotId +
                    "/book/",
                    {
                        method: "POST",

                        headers:
                            headers,

                        credentials:
                            "same-origin",

                        body:
                            JSON.stringify({})
                    }
                );

            let data = {};

            try {
                data =
                    await response.json();
            } catch (error) {
                data = {};
            }

            if (!response.ok) {
                const message =
                    data.detail ||
                    data.message ||
                    data.error ||
                    "Не удалось забронировать место.";

                throw new Error(
                    message
                );
            }

            confirmation.remove();

            showSuccess(data);

            await loadLocations();

        } catch (error) {
            console.error(error);

            button.disabled = false;

            button.textContent =
                "Подтвердить";

            alert(
                error.message ||
                "Ошибка бронирования."
            );
        }
    }


    // ==========================================
    // LOAD MY BOOKING
    // ==========================================

    async function loadMyBooking(locationId) {
        if (!isAuthenticated) {
            return;
        }

        try {
            const response =
                await fetch(
                    "/api/bookings/my/",
                    {
                        method: "GET",

                        headers: {
                            "Accept":
                                "application/json"
                        },

                        credentials:
                            "same-origin"
                    }
                );

            if (!response.ok) {
                return;
            }

            const data =
                await response.json();

            let bookings = data;

            if (
                data &&
                !Array.isArray(data) &&
                Array.isArray(data.results)
            ) {
                bookings =
                    data.results;
            }

            if (!Array.isArray(bookings)) {
                return;
            }

            const activeBooking =
                bookings.find(function (booking) {
                    const bookingLocation =
                        booking.location_id ||
                        (
                            booking.spot &&
                            booking.spot.location
                        );

                    return (
                        bookingLocation ==
                        locationId &&
                        (
                            booking.status === "active" ||
                            booking.is_active === true ||
                            !booking.status
                        )
                    );
                });

            if (activeBooking) {
                showActiveBooking(
                    activeBooking
                );
            }

        } catch (error) {
            console.log(
                "Активные бронирования не загружены."
            );
        }
    }


    // ==========================================
    // SHOW ACTIVE BOOKING
    // ==========================================

    function showActiveBooking(
        booking
    ) {
        if (!spotsContainer) {
            return;
        }

        const oldPanel =
            spotsContainer.querySelector(
                ".active-booking"
            );

        if (oldPanel) {
            oldPanel.remove();
        }

        const spot =
            booking.spot || {};

        const number =
            spot.number ||
            booking.spot_number ||
            booking.number ||
            "—";

        const bookingId =
            booking.id ||
            booking.booking_id;

        if (!bookingId) {
            return;
        }

        const panel =
            document.createElement("div");

        panel.className =
            "booking-panel active-booking";

        panel.innerHTML =
            "<div>" +

            "<small>Ваше активное бронирование</small>" +

            "<strong>" +
            escapeHtml(
                String(number)
            ) +
            "</strong>" +

            "</div>" +

            '<button ' +
            'type="button" ' +
            'class="cancel-booking-button">' +
            "Отменить бронь" +
            "</button>";

        const button =
            panel.querySelector(
                ".cancel-booking-button"
            );

        button.addEventListener(
            "click",
            function () {
                cancelBooking(
                    bookingId,
                    button
                );
            }
        );

        spotsContainer.appendChild(
            panel
        );
    }


    // ==========================================
    // CANCEL BOOKING
    // ==========================================

    async function cancelBooking(bookingId, button) {
    if (!isAuthenticated) {
        window.location.href = "/login/";
        return;
    }

    const confirmed = window.confirm(
        "Вы действительно хотите отменить бронирование?"
    );

    if (!confirmed) {
        return;
    }

    button.disabled = true;
    button.innerHTML = "⏳ Отмена...";

    try {
        const csrfToken = getCookie("csrftoken");

        const headers = {
            "Accept": "application/json",
            "Content-Type": "application/json"
        };

        if (csrfToken) {
            headers["X-CSRFToken"] = csrfToken;
        }

        const response = await fetch(
            "/api/bookings/" + bookingId + "/cancel/",
            {
                method: "POST",
                headers: headers,
                credentials: "same-origin"
            }
        );

        let data = {};

        try {
            data = await response.json();
        } catch (error) {
            data = {};
        }

        if (!response.ok) {
            throw new Error(
                data.message ||
                data.detail ||
                data.error ||
                "Не удалось отменить бронирование."
            );
        }

        button.innerHTML = "✓ Бронирование отменено";
        button.classList.add("cancelled");

        await loadLocations();

        if (selectedLocation) {
            await loadSpots(selectedLocation.id);
        }

    } catch (error) {
        console.error(error);

        button.disabled = false;
        button.innerHTML = "↩ Отменить бронирование";

        alert(
            error.message ||
            "Ошибка отмены бронирования."
        );
    }
}


    // ==========================================
    // SUCCESS
    // ==========================================

    function showSuccess(data) {
        const reservationNumber =
            data.booking_id ||
            data.id ||
            data.reservation_id ||
            "";

        const message =
            data.detail ||
            data.message ||
            "Парковочное место успешно забронировано!";

        const overlay =
            document.createElement("div");

        overlay.className =
            "confirmation-overlay";

        overlay.innerHTML =
            '<div class="confirmation">' +

            '<div class="success-icon">' +
            "✓" +
            "</div>" +

            "<h3>Бронирование подтверждено!</h3>" +

            "<p>" +
            escapeHtml(
                String(message)
            ) +
            "</p>" +

            (
                reservationNumber
                    ? "<p>" +
                      "Номер бронирования: " +
                      "<strong>" +
                      escapeHtml(
                          String(
                              reservationNumber
                          )
                      ) +
                      "</strong>" +
                      "</p>"
                    : ""
            ) +

            '<button ' +
            'type="button" ' +
            'class="confirm-button">' +
            "Готово" +
            "</button>" +

            "</div>";

        const button =
            overlay.querySelector(
                ".confirm-button"
            );

        button.addEventListener(
            "click",
            function () {
                overlay.remove();

                closeParkingModal();

                selectedSpot = null;
                selectedLocation = null;
            }
        );

        document.body.appendChild(
            overlay
        );
    }


    // ==========================================
    // CLOSE MODAL
    // ==========================================

    window.closeParkingModal =
        function () {
            if (parkingModal) {
                parkingModal.classList.add(
                    "hidden"
                );
            }

            selectedSpot = null;
            selectedLocation = null;

            if (bookingResult) {
                bookingResult.innerHTML = "";

                bookingResult.classList.add(
                    "hidden"
                );
            }
        };


    // ==========================================
    // CLOSE BUTTON
    // ==========================================

    const modalClose =
        document.getElementById(
            "modal-close"
        );

    if (modalClose) {
        modalClose.addEventListener(
            "click",
            function () {
                closeParkingModal();
            }
        );
    }


    // ==========================================
    // ESCAPE
    // ==========================================

    document.addEventListener(
        "keydown",
        function (event) {
            if (event.key === "Escape") {

                const confirmation =
                    document.querySelector(
                        ".confirmation-overlay"
                    );

                if (confirmation) {
                    confirmation.remove();
                    return;
                }

                closeParkingModal();
            }
        }
    );


    // ==========================================
    // HTML SAFETY
    // ==========================================

    function escapeHtml(value) {
        return String(value)
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );
    }


    // ==========================================
    // START
    // ==========================================

    initMap();

    loadLocations();
});

