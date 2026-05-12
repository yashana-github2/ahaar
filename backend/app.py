from flask import Flask, request, jsonify, send_from_directory, session
from flask_cors import CORS
import mysql.connector
import bcrypt

app = Flask(__name__)
app.secret_key = "CHANGE_THIS_TO_A_RANDOM_SECRET"

CORS(
    app,
    supports_credentials=True,
    resources={r"/*": {"origins": [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5000",
        "http://127.0.0.1:5500",
        "http://127.0.0.1:5503"
    ]}}
)

app.config.update(
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_HTTPONLY=True
)

def get_current_user_id():
    user_id = session.get("user_id")
    if not user_id:
        return None
    return user_id


# 🔹 MySQL Connection
db = mysql.connector.connect(
    host="localhost",
    user="root",
    password="",
    database="ahaar"
)

db.reconnect(attempts=3, delay=2)




# 🔹 Auth blueprint (OTP)
from routes.auth import auth_bp
app.register_blueprint(auth_bp, url_prefix="/auth")

# 🔹 Home route
@app.route("/")
def home():
    return "Aahaar Backend Running ✅"


# 🔹 Auth: Register
@app.route("/register", methods=["POST"])

def register():
    data = request.json

    name = data.get("name")
    phone_number = data.get("phone_number")
    email = data.get("email")
    password = data.get("password")
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    is_blind_user = bool(data.get("is_blind_user", False))

    address_line1 = data.get("address_line1")
    address_line2 = data.get("address_line2")
    city = data.get("city")
    state = data.get("state")
    pincode = data.get("pincode")
    delivery_instructions = data.get("delivery_instructions")

    if not name or not phone_number or not email or not password:
        return jsonify({"error": "name, phone_number, email and password are required"}), 400

    cursor = db.cursor(dictionary=True,  buffered=True)

    cursor.execute("SELECT user_id FROM Users WHERE email=%s", (email,))
    if cursor.fetchone():
        cursor.close()
        return jsonify({"error": "Email already registered"}), 409

    cursor.execute(
    """
    INSERT INTO Users
    (name, phone_number, email, password, is_blind_user, address_line1, address_line2,
     city, state, pincode, delivery_instructions, created_at)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
    """,
    (
        name,
        phone_number,
        email,
        hashed.decode("utf-8"),
        is_blind_user,
        address_line1,
        address_line2,
        city,
        state,
        pincode,
        delivery_instructions,
    ),
)
    user_id = cursor.lastrowid
    db.commit()
    cursor.close()

    

    session["user_id"] = user_id

    return jsonify({
    "user_id": user_id,
    "name": name,
    "email": email,
    "is_blind_user": is_blind_user
})

@app.route("/verify-otp", methods=["POST"])
def verify_otp():
    data = request.get_json()

    phone = data.get("phone")
    otp = data.get("otp")

    # For demo purposes we skip real OTP verification
    # and just log the user in if the phone exists.

    cursor = db.cursor(dictionary=True,  buffered=True)
    cursor.execute("SELECT * FROM Users WHERE phone_number=%s", (phone,))
    user = cursor.fetchone()
    cursor.close()

    if not user:
        return jsonify({"success": False, "error": "User not found"}), 404

    # IMPORTANT: create login session
    session["user_id"] = user["user_id"]

    return jsonify({
        "success": True,
        "user_id": user["user_id"]
    })

# 🔹 Menu by restaurant name (path: /menu/RestaurantName or query: ?restaurant=RestaurantName)
@app.route("/menu/<restaurant_name>", methods=["GET"])
def get_menu_by_name(restaurant_name=None):
    name = restaurant_name or request.args.get("restaurant")
    if not name:
        return jsonify({"error": "Restaurant name required"}), 400

    cursor = db.cursor(dictionary=True, buffered=True)
    cursor.execute(
        "SELECT restaurant_id FROM Restaurants WHERE LOWER(name)=LOWER(%s) AND is_active=TRUE LIMIT 1",
        (name,)
    )
    res = cursor.fetchone()
    if not res:
        cursor.close()
        return jsonify([])  # no restaurant found

    restaurant_id = res["restaurant_id"]

    # Fetch menu items
    cursor.execute(
        "SELECT * FROM Menu_Items WHERE restaurant_id=%s AND is_available=TRUE",
        (restaurant_id,)
    )
    items = cursor.fetchall()
    cursor.close()

    return jsonify(items)


# 🔹 Auth: Login
@app.route("/login", methods=["POST"])
def login():

    data = request.get_json()

    phone = data.get("phone_number")
    password = data.get("password")

    cursor = db.cursor(dictionary=True)

    cursor.execute(
        "SELECT * FROM Users WHERE phone_number=%s",
        (phone,)
    )

    user = cursor.fetchone()
    cursor.close()

    if not user:
        return jsonify({"error": "Invalid phone or password"}), 401

    if not bcrypt.checkpw(password.encode("utf-8"), user["password"].encode("utf-8")):
        return jsonify({"error": "Invalid phone or password"}), 401

    session["user_id"] = user["user_id"]

    return jsonify({
        "success": True,
        "user_id": user["user_id"],
        "name": user["name"]
    })

@app.route("/logout", methods=["POST"])
def logout():
    session.pop("user_id", None)
    return jsonify({"message": "Logged out"})


@app.route("/me", methods=["GET"])
def me():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"user": None}), 200

    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT * FROM Users WHERE user_id=%s", (user_id,))
    user = cursor.fetchone()
    cursor.close()

    if not user:
        return jsonify({"user": None}), 200

    return jsonify({"user": user})


# 🔹 Cart
@app.route("/cart", methods=["GET"])
def get_cart():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    cursor = db.cursor(dictionary=True , buffered=True)
    cursor.execute(
        """
        SELECT ci.cart_item_id, ci.item_id, ci.quantity,
               mi.item_name AS item_name, mi.price, ci.restaurant_id
        FROM Cart_Items ci
        JOIN Menu_Items mi ON ci.item_id = mi.item_id
        WHERE ci.user_id=%s
        ORDER BY ci.added_at DESC
        """,
        (user_id,),
    )
    items = cursor.fetchall()
    cursor.close()
    return jsonify(items)


@app.route("/cart/add", methods=["POST"])
def add_to_cart():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    data = request.json or {}
    restaurant_id = data.get("restaurant_id")
    item_id = data.get("item_id")
    quantity = int(data.get("quantity", 1))

    if not restaurant_id or not item_id:
        return jsonify({"error": "restaurant_id and item_id are required"}), 400

    cursor = db.cursor()
    cursor.execute(
        "DELETE FROM Cart_Items WHERE user_id=%s AND restaurant_id!=%s",
        (user_id, restaurant_id),
    )
    cursor.execute(
        """
        INSERT INTO Cart_Items (user_id, restaurant_id, item_id, quantity)
        VALUES (%s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
        """,
        (user_id, restaurant_id, item_id, quantity),
    )
    db.commit()
    cursor.close()
    return jsonify({"message": "Added to cart"})


@app.route("/cart/clear", methods=["POST"])
def clear_cart():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    cursor = db.cursor()
    cursor.execute("DELETE FROM Cart_Items WHERE user_id=%s", (user_id,))
    db.commit()
    cursor.close()
    return jsonify({"message": "Cart cleared"})


@app.route("/cart/update", methods=["POST"])
def update_cart_item():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    data = request.json or {}
    cart_item_id = data.get("cart_item_id")
    item_id = data.get("item_id")
    quantity = int(data.get("quantity", 1))

    if quantity < 0:
        return jsonify({"error": "quantity must be >= 0"}), 400

    cursor = db.cursor(dictionary=True,  buffered=True)

    if cart_item_id:
        cursor.execute(
            "SELECT cart_item_id FROM Cart_Items WHERE cart_item_id=%s AND user_id=%s",
            (cart_item_id, user_id),
        )
        row = cursor.fetchone()
        if not row:
            cursor.close()
            return jsonify({"error": "Cart item not found"}), 404
        if quantity == 0:
            cursor.execute("DELETE FROM Cart_Items WHERE cart_item_id=%s AND user_id=%s", (cart_item_id, user_id))
        else:
            cursor.execute("UPDATE Cart_Items SET quantity=%s WHERE cart_item_id=%s AND user_id=%s", (quantity, cart_item_id, user_id))
    elif item_id:
        cursor.execute(
            "SELECT cart_item_id FROM Cart_Items WHERE item_id=%s AND user_id=%s",
            (item_id, user_id),
        )
        row = cursor.fetchone()
        if not row:
            cursor.close()
            return jsonify({"error": "Cart item not found"}), 404
        if quantity == 0:
            cursor.execute("DELETE FROM Cart_Items WHERE item_id=%s AND user_id=%s", (item_id, user_id))
        else:
            cursor.execute("UPDATE Cart_Items SET quantity=%s WHERE item_id=%s AND user_id=%s", (quantity, item_id, user_id))
    else:
        cursor.close()
        return jsonify({"error": "cart_item_id or item_id is required"}), 400

    db.commit()
    cursor.close()
    return jsonify({"message": "Cart updated"})


@app.route("/cart/remove", methods=["POST"])
def remove_cart_item():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    data = request.json or {}
    cart_item_id = data.get("cart_item_id")
    item_id = data.get("item_id")

    if not cart_item_id and not item_id:
        return jsonify({"error": "cart_item_id or item_id is required"}), 400

    cursor = db.cursor()
    if cart_item_id:
        cursor.execute("DELETE FROM Cart_Items WHERE cart_item_id=%s AND user_id=%s", (cart_item_id, user_id))
    else:
        cursor.execute("DELETE FROM Cart_Items WHERE item_id=%s AND user_id=%s", (item_id, user_id))

    if cursor.rowcount == 0:
        db.commit()
        cursor.close()
        return jsonify({"error": "Cart item not found"}), 404

    db.commit()
    cursor.close()
    return jsonify({"message": "Item removed from cart"})


@app.route("/place-order", methods=["POST"])
def place_order():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    data = request.json or {}
    payment_method = data.get("payment_method", "COD")

    cursor = db.cursor(dictionary=True,  buffered=True)

    cursor.execute(
        """
        SELECT ci.item_id, ci.quantity, ci.restaurant_id, mi.price
        FROM Cart_Items ci
        JOIN Menu_Items mi ON ci.item_id = mi.item_id
        WHERE ci.user_id=%s
        """,
        (user_id,),
    )

    cart_items = cursor.fetchall()

    if not cart_items:
        cursor.close()
        return jsonify({"error": "Cart is empty"}), 400

    restaurant_id = cart_items[0]["restaurant_id"]

    item_total = sum(float(item["price"]) * int(item["quantity"]) for item in cart_items)
    gst = round(item_total * 0.05)
    delivery_fee = 30
    platform_fee = 5
    total_amount = item_total + gst + delivery_fee + platform_fee

    cursor.execute(
        """
        INSERT INTO Orders 
        (user_id, restaurant_id, total_amount, order_status, payment_method, payment_status, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, NOW())
        """,
        (user_id, restaurant_id, total_amount, "Placed", payment_method, "Pending"),
    )

    order_id = cursor.lastrowid

    for item in cart_items:
        cursor.execute(
            """
            INSERT INTO Order_Items (order_id, item_id, quantity, price)
            VALUES (%s, %s, %s, %s)
            """,
            (order_id, item["item_id"], item["quantity"], item["price"]),
        )

    cursor.execute("DELETE FROM Cart_Items WHERE user_id=%s", (user_id,))

    db.commit()
    cursor.close()

    return jsonify({
        "order_id": order_id,
        "message": "Order placed successfully",
        "status": "Placed",
        "item_total": item_total,
        "gst": gst,
        "delivery_fee": delivery_fee,
        "platform_fee": platform_fee,
        "total_amount": total_amount
    })

# 🔹 Accept order (Restaurant)
@app.route("/restaurant/<int:restaurant_id>/orders/<int:order_id>/accept", methods=["POST"])
def restaurant_accept(restaurant_id, order_id):

    cursor = db.cursor()

    cursor.execute("""
        UPDATE Orders
        SET order_status='Accepted'
        WHERE order_id=%s
    """, (order_id,))

    db.commit()
    cursor.close()

    return jsonify({"message": "Order accepted"})

@app.route("/restaurant/orders/<int:order_id>/prepare", methods=["POST"])
def restaurant_prepare(order_id):

    cursor = db.cursor()

    cursor.execute("""
        UPDATE Orders
        SET order_status='Preparing'
        WHERE order_id=%s
    """, (order_id,))

    db.commit()
    cursor.close()

    return jsonify({"message": "Order preparing"})



@app.route("/restaurant/orders/<int:order_id>/ready", methods=["POST"])
def restaurant_ready(order_id):
    cursor = db.cursor(dictionary=True, buffered=True)

    try:
        cursor.execute("""
            UPDATE Orders
            SET order_status='Ready for Pickup'
            WHERE order_id=%s
        """, (order_id,))

        cursor.execute("""
            SELECT partner_id, is_available, availability_status
            FROM Delivery_Partners
            ORDER BY partner_id
            LIMIT 1
        """)
        partner = cursor.fetchone()

        print("DELIVERY PARTNER DEBUG:", partner)

        if not partner:
            db.rollback()
            cursor.close()
            return jsonify({"error": "No delivery partner found"}), 400

        if int(partner["is_available"]) != 1 or partner["availability_status"] != "Available":
            db.rollback()
            cursor.close()
            return jsonify({"error": "No delivery partners available"}), 400

        partner_id = partner["partner_id"]

        cursor.execute("""
            SELECT assignment_id
            FROM Delivery_Assignments
            WHERE order_id=%s
        """, (order_id,))
        existing = cursor.fetchone()

        if not existing:
            cursor.execute("""
                INSERT INTO Delivery_Assignments (order_id, partner_id, delivery_status)
                VALUES (%s, %s, 'Pending')
            """, (order_id, partner_id))

        cursor.execute("""
            UPDATE Delivery_Partners
            SET is_available = 0,
                availability_status = 'Busy'
            WHERE partner_id = %s
        """, (partner_id,))

        db.commit()
        cursor.close()

        return jsonify({
            "message": "Order ready for pickup",
            "partner_id": partner_id
        })

    except Exception as e:
        db.rollback()
        print("READY ROUTE ERROR:", e)
        cursor.close()
        return jsonify({"error": str(e)}), 500
    
@app.route("/delivery/<int:partner_id>/assignments", methods=["GET"])
def get_assignments(partner_id):
    cursor = db.cursor(dictionary=True, buffered=True)

    try:
        cursor.execute("""
            SELECT
                da.assignment_id,
                da.order_id,
                da.delivery_status,
                o.total_amount,
                o.order_status,
                o.restaurant_id,
                o.user_id
            FROM Delivery_Assignments da
            JOIN Orders o ON da.order_id = o.order_id
            WHERE da.partner_id = %s
            ORDER BY da.assignment_id DESC
        """, (partner_id,))

        assignments = cursor.fetchall()

        for a in assignments:
            a["restaurant_name"] = f"Restaurant {a['restaurant_id']}"
            a["user_name"] = f"User {a['user_id']}"

        cursor.close()
        return jsonify(assignments)

    except Exception as e:
        print("DELIVERY ASSIGNMENTS ERROR:", e)
        cursor.close()
        return jsonify({"error": str(e)}), 500
    
@app.route("/my-orders")
def my_orders():

    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"error":"Not logged in"}),401

    cursor = db.cursor(dictionary=True)

    cursor.execute("""
        SELECT order_id,total_amount,order_status,payment_status,created_at
        FROM Orders
        WHERE user_id=%s
        ORDER BY order_id DESC
    """,(user_id,))

    orders = cursor.fetchall()
    cursor.close()

    return jsonify(orders)

# 🔹 Delivery partner actions
@app.route("/delivery/<int:partner_id>/assignments/<int:assignment_id>/accept", methods=["POST"])
def accept_assignment(partner_id, assignment_id):
    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute("""
            UPDATE Delivery_Assignments
            SET delivery_status='Accepted'
            WHERE assignment_id=%s AND partner_id=%s
        """, (assignment_id, partner_id))

        cursor.execute("""
            SELECT order_id
            FROM Delivery_Assignments
            WHERE assignment_id=%s AND partner_id=%s
        """, (assignment_id, partner_id))

        assignment = cursor.fetchone()

        if assignment:
            cursor.execute("""
                UPDATE Orders
                SET order_status='Out for Delivery'
                WHERE order_id=%s
            """, (assignment["order_id"],))

        db.commit()
        cursor.close()

        return jsonify({"message": "Delivery Accepted"})

    except Exception as e:
        db.rollback()
        cursor.close()
        return jsonify({"error": str(e)}), 500

@app.route("/delivery/<int:partner_id>/assignments/<int:assignment_id>/decline", methods=["POST"])
def decline_assignment(partner_id, assignment_id):
    data = request.json or {}
    reason = data.get("reason", "No reason")

    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute("""
            UPDATE Delivery_Assignments
            SET delivery_status='Declined',
                decline_reason=%s
            WHERE assignment_id=%s AND partner_id=%s
        """, (reason, assignment_id, partner_id))

        cursor.execute("""
            UPDATE Delivery_Partners
            SET is_available = 1,
                availability_status = 'Available'
            WHERE partner_id = %s
        """, (partner_id,))

        db.commit()
        cursor.close()

        return jsonify({"message": "Delivery Declined"})

    except Exception as e:
        db.rollback()
        cursor.close()
        return jsonify({"error": str(e)}), 500

# 🔹 Get single order for tracking
@app.route("/order/<int:order_id>", methods=["GET"])
def get_order(order_id):
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT * FROM Orders WHERE order_id=%s", (order_id,))
    order = cursor.fetchone()
    if not order:
        cursor.close()
        return jsonify({"error": "Order not found"}), 404

    cursor.execute("SELECT * FROM Delivery_Assignments WHERE order_id=%s", (order_id,))
    assignment = cursor.fetchone()
    cursor.close()

    order_data = {
        "order_id": order["order_id"],
        "order_status": order["order_status"],
        "payment_status": order["payment_status"],
        "delivery_assignment": assignment
    }
    return jsonify(order_data)

# 🔹 Restaurant dashboard
@app.route("/restaurant/<int:restaurant_id>/orders", methods=["GET"])
def restaurant_orders(restaurant_id):

    cursor = db.cursor(dictionary=True)

    cursor.execute("""
        SELECT o.order_id,
               o.total_amount,
               o.order_status,
               o.created_at,
               u.name AS customer_name
        FROM Orders o
        JOIN Users u ON o.user_id = u.user_id
        WHERE o.restaurant_id=%s
        ORDER BY o.order_id DESC
    """, (restaurant_id,))

    orders = cursor.fetchall()
    cursor.close()

    return jsonify(orders)

@app.route("/admin/stats")
def admin_stats():

    cursor = db.cursor(dictionary=True)

    cursor.execute("""
        SELECT COUNT(*) as total_orders,
               SUM(total_amount) as revenue
        FROM Orders
    """)

    stats = cursor.fetchone()

    cursor.close()

    return jsonify(stats)

@app.route("/restaurant/<int:restaurant_id>/stats")
def restaurant_stats(restaurant_id):

    cursor = db.cursor(dictionary=True)

    cursor.execute("""
        SELECT COUNT(*) as total_orders,
               SUM(total_amount) as revenue
        FROM Orders
        WHERE restaurant_id=%s
    """, (restaurant_id,))

    stats = cursor.fetchone()
    cursor.close()

    return jsonify(stats)

#payment
@app.route("/payment/<int:order_id>/complete", methods=["POST"])
def complete_payment(order_id):

    data = request.json or {}
    method = data.get("method", "UPI")

    cursor = db.cursor()

    cursor.execute("""
        UPDATE Orders
        SET payment_status='Paid'
        WHERE order_id=%s
    """, (order_id,))

    db.commit()
    cursor.close()

    return jsonify({
        "message": "Payment successful",
        "order_id": order_id,
        "payment_method": method
    })

# 🔹 Admin dashboard
@app.route("/admin/orders", methods=["GET"])
def admin_orders():

    cursor = db.cursor(dictionary=True)

    cursor.execute("""
        SELECT 
            o.order_id,
            r.name AS restaurant_name,
            u.name AS user_name,
            o.total_amount,
            o.order_status,
            o.payment_status
        FROM Orders o
        LEFT JOIN Restaurants r ON o.restaurant_id = r.restaurant_id
        LEFT JOIN Users u ON o.user_id = u.user_id
        ORDER BY o.order_id DESC
    """)

    orders = cursor.fetchall()
    cursor.close()

    return jsonify(orders)





@app.route("/delivery/<int:partner_id>/orders/<int:order_id>/complete", methods=["POST"])
def complete_delivery(partner_id, order_id):
    cursor = db.cursor(dictionary=True, buffered=True)

    try:
        cursor.execute("""
            UPDATE Orders
            SET order_status='Delivered'
            WHERE order_id=%s
        """, (order_id,))

        cursor.execute("""
            UPDATE Delivery_Assignments
            SET delivery_status='Completed'
            WHERE order_id=%s AND partner_id=%s
        """, (order_id, partner_id))

        cursor.execute("""
            UPDATE Orders
            SET payment_status='Paid'
            WHERE order_id=%s AND payment_status='Pending'
        """, (order_id,))

        cursor.execute("""
            UPDATE Delivery_Partners
            SET is_available = 1,
                availability_status = 'Available'
            WHERE partner_id = %s
        """, (partner_id,))

        db.commit()
        cursor.close()

        return jsonify({"message": "Order delivered"})

    except Exception as e:
        db.rollback()
        cursor.close()
        return jsonify({"error": str(e)}), 500
    
if __name__ == "__main__":
    app.run(debug=True)
