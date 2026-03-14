import random
import math


def generate_arithmetic(difficulty: str) -> dict:
    """Generate a randomized arithmetic problem."""
    if difficulty == "easy":
        a = random.randint(1, 20)
        b = random.randint(1, 20)
        op = random.choice(["+", "-"])
    elif difficulty == "medium":
        a = random.randint(10, 100)
        b = random.randint(10, 100)
        op = random.choice(["+", "-", "*"])
    else:  # hard
        a = random.randint(10, 500)
        b = random.randint(2, 50)
        op = random.choice(["+", "-", "*", "/"])

    if op == "/":
        # Make sure division is clean
        a = a * b  # ensure exact division
        answer = a // b
        question = f"What is {a} \\div {b}?"
        latex = f"$${a} \\div {b} = ?$$"
        explanation = f"{a} divided by {b} equals {answer}."
    elif op == "+":
        answer = a + b
        question = f"What is {a} + {b}?"
        latex = f"$${a} + {b} = ?$$"
        explanation = f"Adding {a} and {b} gives {answer}."
    elif op == "-":
        if a < b:
            a, b = b, a
        answer = a - b
        question = f"What is {a} - {b}?"
        latex = f"$${a} - {b} = ?$$"
        explanation = f"Subtracting {b} from {a} gives {answer}."
    else:  # *
        answer = a * b
        question = f"What is {a} \\times {b}?"
        latex = f"$${a} \\times {b} = ?$$"
        explanation = f"Multiplying {a} by {b} gives {answer}."

    return {
        "question": question,
        "answer": str(answer),
        "explanation": explanation,
        "latex": latex,
    }


def generate_algebra(difficulty: str) -> dict:
    """Generate a randomized algebra problem (solve for x)."""
    if difficulty == "easy":
        # ax + b = c  (small positive integers)
        a = random.randint(1, 5)
        x = random.randint(1, 10)
        b = random.randint(1, 10)
        c = a * x + b
        question = f"Solve for x: {a}x + {b} = {c}"
        latex = f"$${a}x + {b} = {c}$$"
        explanation = f"Subtract {b} from both sides: {a}x = {c - b}. Divide by {a}: x = {x}."
        answer = str(x)
    elif difficulty == "medium":
        # ax + b = cx + d
        a = random.randint(2, 8)
        c_coeff = random.randint(1, a - 1)
        x = random.randint(-10, 10)
        b = random.randint(1, 20)
        d = a * x + b - c_coeff * x
        question = f"Solve for x: {a}x + {b} = {c_coeff}x + {d}"
        latex = f"$${a}x + {b} = {c_coeff}x + {d}$$"
        diff_a = a - c_coeff
        diff_d = d - b
        explanation = (
            f"Move x terms to one side: ({a} - {c_coeff})x = {d} - {b}. "
            f"Simplify: {diff_a}x = {diff_d}. "
            f"Divide: x = {x}."
        )
        answer = str(x)
    else:  # hard
        # ax^2 + bx + c = 0 with integer roots
        r1 = random.randint(-6, 6)
        r2 = random.randint(-6, 6)
        # (x - r1)(x - r2) = x^2 - (r1+r2)x + r1*r2
        a_coeff = 1
        b_coeff = -(r1 + r2)
        c_coeff = r1 * r2
        terms = [f"x^2"]
        if b_coeff != 0:
            terms.append(f"{'+' if b_coeff > 0 else ''}{b_coeff}x")
        if c_coeff != 0:
            terms.append(f"{'+' if c_coeff > 0 else ''}{c_coeff}")
        expr = " ".join(terms)
        question = f"Solve for x: {expr} = 0"
        latex = f"$$x^2 {'+' if b_coeff >= 0 else ''} {b_coeff}x {'+' if c_coeff >= 0 else ''} {c_coeff} = 0$$"
        explanation = (
            f"Factor: (x - {r1})(x - {r2}) = 0. "
            f"So x = {r1} or x = {r2}."
        )
        if r1 == r2:
            answer = str(r1)
        else:
            roots = sorted([r1, r2])
            answer = f"x = {roots[0]} or x = {roots[1]}"

    return {
        "question": question,
        "answer": answer,
        "explanation": explanation,
        "latex": latex,
    }


def generate_geometry(difficulty: str) -> dict:
    """Generate a randomized geometry problem (area/perimeter)."""
    if difficulty == "easy":
        # Rectangle area or perimeter
        shape = random.choice(["rectangle_area", "rectangle_perimeter"])
        w = random.randint(2, 15)
        h = random.randint(2, 15)
        if shape == "rectangle_area":
            answer_val = w * h
            question = f"Find the area of a rectangle with width {w} and height {h}."
            latex = f"$$A = w \\times h = {w} \\times {h} = ?$$"
            explanation = f"Area = width x height = {w} x {h} = {answer_val}."
        else:
            answer_val = 2 * (w + h)
            question = f"Find the perimeter of a rectangle with width {w} and height {h}."
            latex = f"$$P = 2(w + h) = 2({w} + {h}) = ?$$"
            explanation = f"Perimeter = 2(width + height) = 2({w} + {h}) = {answer_val}."
        answer = str(answer_val)

    elif difficulty == "medium":
        # Circle area or circumference
        shape = random.choice(["circle_area", "circle_circumference"])
        r = random.randint(2, 20)
        if shape == "circle_area":
            answer_val = round(math.pi * r * r, 2)
            question = f"Find the area of a circle with radius {r}. Round to 2 decimal places."
            latex = f"$$A = \\pi r^2 = \\pi \\times {r}^2 = ?$$"
            explanation = f"Area = pi x r^2 = pi x {r * r} = {answer_val}."
        else:
            answer_val = round(2 * math.pi * r, 2)
            question = f"Find the circumference of a circle with radius {r}. Round to 2 decimal places."
            latex = f"$$C = 2\\pi r = 2 \\times \\pi \\times {r} = ?$$"
            explanation = f"Circumference = 2 x pi x {r} = {answer_val}."
        answer = str(answer_val)

    else:  # hard
        # Triangle area with base and height, or trapezoid
        shape = random.choice(["triangle", "trapezoid"])
        if shape == "triangle":
            base = random.randint(5, 30)
            height = random.randint(5, 30)
            answer_val = round(0.5 * base * height, 2)
            question = f"Find the area of a triangle with base {base} and height {height}."
            latex = f"$$A = \\frac{{1}}{{2}} \\times b \\times h = \\frac{{1}}{{2}} \\times {base} \\times {height} = ?$$"
            explanation = f"Area = 0.5 x base x height = 0.5 x {base} x {height} = {answer_val}."
        else:
            a = random.randint(5, 20)
            b = random.randint(5, 20)
            h = random.randint(3, 15)
            answer_val = round(0.5 * (a + b) * h, 2)
            question = f"Find the area of a trapezoid with parallel sides {a} and {b}, and height {h}."
            latex = f"$$A = \\frac{{1}}{{2}}(a + b) \\times h = \\frac{{1}}{{2}}({a} + {b}) \\times {h} = ?$$"
            explanation = f"Area = 0.5 x ({a} + {b}) x {h} = 0.5 x {a + b} x {h} = {answer_val}."
        answer = str(answer_val)

    return {
        "question": question,
        "answer": answer,
        "explanation": explanation,
        "latex": latex,
    }


def check_answer(user_answer: str, correct_answer: str) -> bool:
    """Check if user's answer matches the correct answer.
    Handles numeric comparison with tolerance for floating point."""
    user_answer = user_answer.strip()
    correct_answer = correct_answer.strip()

    # Direct string match
    if user_answer.lower() == correct_answer.lower():
        return True

    # Try numeric comparison
    try:
        user_val = float(user_answer)
        correct_val = float(correct_answer)
        return abs(user_val - correct_val) < 0.02
    except ValueError:
        pass

    # Handle "x = A or x = B" style answers
    if "or" in correct_answer.lower():
        parts = correct_answer.lower().replace("x =", "").replace("x=", "").split("or")
        correct_vals = set()
        for p in parts:
            p = p.strip()
            try:
                correct_vals.add(float(p))
            except ValueError:
                correct_vals.add(p)
        try:
            user_val = float(user_answer)
            if user_val in correct_vals:
                return True
        except ValueError:
            pass

    return False
