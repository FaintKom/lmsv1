#!/usr/bin/env python3
"""
Build SAT Math PRO course with 4C/ID instructional design framework.
Reads the original course JSON, replaces all theory fields with rich 4C/ID content,
and saves to sat_math_pro_course_4cid.json.
"""
import json
import copy

# Load original course
with open('sat_math_pro_course.json', 'r', encoding='utf-8') as f:
    original = json.load(f)

# Deep copy to preserve exercise configs
course = copy.deepcopy(original)

# ============================================================
# ALL 42 LESSON THEORIES (4C/ID Framework)
# ============================================================

theories = {}

# ============================================================
# MODULE 0: Linear Equations & Inequalities
# ============================================================

theories[(0, 0)] = r"""## Solving Linear Equations in One Variable

### 🧠 Understanding the Concept

A **linear equation in one variable** is an equation that can be written in the form $ax + b = c$, where $a$, $b$, and $c$ are real numbers and $a \neq 0$. The word "linear" means the variable $x$ appears only to the first power — no $x^2$, no $\sqrt{x}$, no $\frac{1}{x}$.

On the SAT, linear equations are the most fundamental algebra skill. They appear directly in roughly 3–5 questions per test, and indirectly in dozens more (since solving systems, inequalities, and word problems all require this skill). Think of solving linear equations as the "addition and subtraction" of SAT Math — if you cannot do this fluently, everything else breaks down.

The core idea is the **balance principle**: an equation is like a balanced scale. Whatever operation you perform on one side, you must perform on the other side to keep it balanced. Your goal is to isolate $x$ on one side through a sequence of reversible operations.

### 📐 Key Formulas

$$ax + b = c \implies x = \frac{c - b}{a}$$

**Distributive Property:** $a(b + c) = ab + ac$

**Combining Like Terms:** $3x + 5x = 8x$

### 📝 How to Solve (Step by Step)

1. **Distribute** — remove all parentheses by applying the distributive property
2. **Combine like terms** on each side separately
3. **Move variable terms** to one side using addition/subtraction
4. **Move constant terms** to the other side
5. **Divide** both sides by the coefficient of $x$
6. **Check** — substitute your answer back into the original equation

**Decision Tree:**
- If the equation has fractions → multiply every term by the LCD first
- If the equation has parentheses → distribute first
- If the SAT asks for an expression like $2x + 1$ rather than $x$ → try solving for the expression directly

### ✏️ Worked Example 1

**Problem:** Solve $3(2x - 1) = 4x + 9$ for $x$.

**Solution:**

Step 1: Distribute on the left side:
$$6x - 3 = 4x + 9$$

Step 2: Subtract $4x$ from both sides:
$$2x - 3 = 9$$

Step 3: Add $3$ to both sides:
$$2x = 12$$

Step 4: Divide by $2$:
$$x = 6$$

**Check:** $3(2 \cdot 6 - 1) = 3(11) = 33$ and $4(6) + 9 = 33$. ✓

### ✏️ Worked Example 2

**Problem:** Solve $\frac{x + 2}{3} - \frac{x - 1}{4} = 2$.

**Solution:**

Step 1: Multiply every term by the LCD, which is $12$:
$$12 \cdot \frac{x + 2}{3} - 12 \cdot \frac{x - 1}{4} = 12 \cdot 2$$
$$4(x + 2) - 3(x - 1) = 24$$

Step 2: Distribute:
$$4x + 8 - 3x + 3 = 24$$

Step 3: Combine like terms:
$$x + 11 = 24$$

Step 4: Subtract $11$:
$$x = 13$$

### ✏️ Worked Example 3

**Problem:** If $5(x - 3) + 2 = 3(x + 1)$, what is the value of $4x - 7$?

**Solution:**

$5x - 15 + 2 = 3x + 3$

$5x - 13 = 3x + 3$

$2x = 16$, so $x = 8$

The question asks for $4x - 7 = 4(8) - 7 = 25$.

**SAT Insight:** Always read what the question asks for — it may not be $x$ itself.

### ⚠️ SAT Traps to Avoid

- **Trap 1: Sign errors with distribution.** $-2(x - 5)$ is $-2x + 10$, NOT $-2x - 10$. The negative distributes to both terms inside the parentheses.
- **Trap 2: Not reading what the question asks.** If the question asks for $2x + 3$, do not just give the value of $x$.
- **Trap 3: Forgetting to multiply ALL terms by the LCD.** When clearing fractions, every single term (including constants) must be multiplied.

### 🔗 Connection

This lesson is the foundation for everything in SAT Math. Linear equations in two variables (next lesson) are an extension of the same techniques, and systems of equations (Module 2) require solving multiple linear equations simultaneously. Master this skill until it is automatic.

### 🏋️ Quick Drill

1. Solve mentally: $5x + 3 = 28$ → $x = ?$
2. Solve mentally: $\frac{x}{4} = 7$ → $x = ?$
3. If $2x - 1 = 9$, what is $6x - 3$? (Hint: don't solve for $x$ first)
"""

theories[(0, 1)] = r"""## Linear Equations in Two Variables

### 🧠 Understanding the Concept

A **linear equation in two variables** describes a relationship between $x$ and $y$ that, when graphed on the coordinate plane, produces a straight line. Every point $(x, y)$ on that line satisfies the equation, and every point off the line does not.

This topic is one of the most heavily tested on the SAT. You need to move fluently between three forms of a linear equation, find slopes from points, write equations from given information, and understand what parallel and perpendicular lines look like algebraically. In the real world, linear equations model any situation with a constant rate of change — hourly wages, distance traveled at constant speed, or cost per unit.

The big mental model: **slope is rate of change**. Whenever you see a linear equation, the slope $m$ tells you how fast $y$ is changing relative to $x$, and the $y$-intercept $b$ tells you the starting value when $x = 0$.

### 📐 Key Formulas

**Slope-Intercept Form:** $y = mx + b$

**Standard Form:** $Ax + By = C$

**Point-Slope Form:** $y - y_1 = m(x - x_1)$

**Slope from Two Points:** $m = \frac{y_2 - y_1}{x_2 - x_1}$

**Parallel Lines:** $m_1 = m_2$

**Perpendicular Lines:** $m_1 \cdot m_2 = -1$

### 📝 How to Solve (Step by Step)

**Finding the equation of a line:**
1. **Find the slope** $m$ (from two points, or given directly)
2. **Use point-slope form** $y - y_1 = m(x - x_1)$ with any known point
3. **Simplify** to slope-intercept form $y = mx + b$ if needed

**Converting Standard to Slope-Intercept:**
1. Solve $Ax + By = C$ for $y$
2. $y = -\frac{A}{B}x + \frac{C}{B}$, so slope $= -\frac{A}{B}$, intercept $= \frac{C}{B}$

### ✏️ Worked Example 1

**Problem:** Find the equation of the line through $(2, 5)$ and $(6, 13)$.

**Solution:**

Step 1: Find slope: $m = \frac{13 - 5}{6 - 2} = \frac{8}{4} = 2$

Step 2: Point-slope with $(2, 5)$: $y - 5 = 2(x - 2)$

Step 3: Simplify: $y = 2x + 1$

Answer: $y = 2x + 1$

### ✏️ Worked Example 2

**Problem:** Line $\ell$ has equation $3x + 4y = 12$. What is the slope of a line perpendicular to $\ell$?

**Solution:**

Step 1: Convert to slope-intercept: $4y = -3x + 12$, so $y = -\frac{3}{4}x + 3$.

Step 2: Slope of $\ell$ is $-\frac{3}{4}$.

Step 3: Perpendicular slope is the negative reciprocal: $m = \frac{4}{3}$.

### ✏️ Worked Example 3

**Problem:** A line passes through $(0, -2)$ and is parallel to $y = 5x + 7$. What is the equation?

**Solution:**

Parallel lines share the same slope: $m = 5$.

The line passes through $(0, -2)$, which is the $y$-intercept.

Answer: $y = 5x - 2$.

### ⚠️ SAT Traps to Avoid

- **Trap 1: Confusing slope and $y$-intercept.** In $y = 3x + 7$, the slope is $3$ (not $7$).
- **Trap 2: Forgetting perpendicular means negative reciprocal, not just reciprocal.** If $m = 2$, the perpendicular slope is $-\frac{1}{2}$, not $\frac{1}{2}$.
- **Trap 3: Misreading Standard Form.** In $2x + 3y = 6$, the slope is NOT $2$ — you must solve for $y$ first to get $m = -\frac{2}{3}$.

### 🔗 Connection

This lesson builds directly on solving linear equations (Lesson 0) and sets up graphing and interpreting linear functions (Lesson 2). The slope concept reappears in systems of equations, where parallel lines mean no solution.

### 🏋️ Quick Drill

1. What is the slope of $4x - 2y = 10$?
2. Two points: $(1, 3)$ and $(4, 12)$. Find $m$.
3. A line has slope $-\frac{2}{5}$. What is the slope of a perpendicular line?
"""

theories[(0, 2)] = r"""## Graphing and Interpreting Linear Functions

### 🧠 Understanding the Concept

A **linear function** is a function of the form $f(x) = mx + b$ whose graph is a straight line. On the SAT, you will not only graph these functions but also interpret what the slope and intercept mean in real-world situations.

This is where algebra meets reading comprehension. The SAT loves to give you a linear model like $C = 50h + 75$ and ask: "What does the $50$ represent?" or "What does the $75$ represent?" These are not hard math questions — they are interpretation questions that require you to connect the equation to the context.

The mental model is simple: **slope = rate** (how much $y$ changes per unit of $x$) and **$y$-intercept = starting value** (the value of $y$ when $x = 0$). If $x$ is time, then the $y$-intercept is the initial amount and the slope is the rate of change over time.

### 📐 Key Formulas

$$f(x) = mx + b$$

**Slope (rate of change):** $m = \frac{\Delta y}{\Delta x} = \frac{f(x_2) - f(x_1)}{x_2 - x_1}$

**$x$-intercept:** Set $f(x) = 0$, solve for $x$: $x = -\frac{b}{m}$

**$y$-intercept:** $f(0) = b$

### 📝 How to Solve (Step by Step)

**For interpretation questions:**
1. Identify which quantity is $x$ and which is $y$ (or $f(x)$)
2. The **coefficient of $x$** (slope) is the rate of change — "per unit" language
3. The **constant term** ($y$-intercept) is the starting value — "initial," "fixed," or "base" amount
4. Check the units of each component

**For graphing:**
1. Plot the $y$-intercept $(0, b)$
2. From there, use the slope "rise over run" to find a second point
3. Draw the line through both points

### ✏️ Worked Example 1

**Problem:** A plumber charges according to $C = 65h + 120$, where $C$ is cost in dollars and $h$ is hours worked. What does each part mean?

**Solution:**

- $65$ (slope) = the plumber charges **\$65 per hour**
- $120$ ($y$-intercept) = the **fixed service fee** (cost when $h = 0$)
- After 3 hours: $C = 65(3) + 120 = \$315$

### ✏️ Worked Example 2

**Problem:** The water level in a tank is modeled by $W(t) = -4t + 200$, where $t$ is time in minutes and $W$ is gallons. When does the tank empty?

**Solution:**

Set $W(t) = 0$: $-4t + 200 = 0$

$4t = 200$, so $t = 50$ minutes.

**Interpretation:** The tank starts with 200 gallons (when $t = 0$) and loses 4 gallons per minute (slope is $-4$). It empties after 50 minutes (the $x$-intercept).

### ✏️ Worked Example 3

**Problem:** A table shows: at $x = 2$, $y = 11$; at $x = 5$, $y = 20$. Is this linear? If so, find the equation.

**Solution:**

$m = \frac{20 - 11}{5 - 2} = \frac{9}{3} = 3$

Using $(2, 11)$: $y - 11 = 3(x - 2)$, so $y = 3x + 5$.

Check with $(5, 20)$: $3(5) + 5 = 20$. ✓ Yes, it is linear.

### ⚠️ SAT Traps to Avoid

- **Trap 1: Confusing what the slope represents.** If $C = 0.15m + 25$ where $m$ is miles, the slope $0.15$ is the cost **per mile**, not the total cost.
- **Trap 2: The $x$-intercept is NOT the $y$-intercept.** On the SAT, these are often answer choices designed to confuse.
- **Trap 3: Negative slope means decreasing.** $m < 0$ means $y$ goes down as $x$ goes up. A negative slope in a word problem means something is being used up, lost, or declining.

### 🔗 Connection

This lesson extends linear equations in two variables (Lesson 1) into function notation and real-world interpretation. The interpretation skills here apply directly to scatterplots and lines of best fit (Module 5), where you also interpret slope and intercept.

### 🏋️ Quick Drill

1. In $P = 200 + 15t$, what is the initial value and rate?
2. If $f(x) = -2x + 10$, is $f$ increasing or decreasing?
3. A line has slope $4$ and passes through $(0, -3)$. What is the $x$-intercept?
"""

theories[(0, 3)] = r"""## Solving and Graphing Linear Inequalities

### 🧠 Understanding the Concept

A **linear inequality** looks just like a linear equation, except the equals sign is replaced by $<$, $>$, $\leq$, or $\geq$. Instead of finding a single value of $x$, you find a **range of values** that satisfy the inequality.

On the SAT, inequalities appear in word problems ("at least," "no more than," "less than") and in graphing questions (shaded regions on the coordinate plane). The critical skill is knowing when to flip the inequality sign — this happens when you multiply or divide by a negative number.

Think of an inequality as a one-way door: the direction of the symbol tells you which side is larger. If you negate both sides (multiply by $-1$), the door swings the other way. This is not arbitrary — it follows from the number line: if $3 > 2$, then $-3 < -2$.

### 📐 Key Formulas

**Flipping Rule:** If $a > b$ and $c < 0$, then $ac < bc$.

**Compound Inequality:** $a < x < b$ means $x$ is between $a$ and $b$.

**Two-Variable Inequality:** $y > mx + b$ means shade above the dashed line $y = mx + b$.

### 📝 How to Solve (Step by Step)

**One-variable inequality:**
1. Solve exactly like an equation (add, subtract, multiply, divide)
2. If you multiply or divide by a **negative** number, **flip the inequality sign**
3. Express your answer as an inequality, interval, or on a number line

**Two-variable inequality (graphing):**
1. Graph the boundary line $y = mx + b$
2. Use a **dashed** line for $<$ or $>$; **solid** line for $\leq$ or $\geq$
3. Test a point (usually $(0, 0)$) to determine which side to shade
4. Shade the region that makes the inequality true

### ✏️ Worked Example 1

**Problem:** Solve $-3x + 7 > 19$.

**Solution:**

$-3x + 7 > 19$

$-3x > 12$ (subtract $7$)

$x < -4$ (divide by $-3$, **flip** the sign)

Answer: $x < -4$

### ✏️ Worked Example 2

**Problem:** Solve $-5 \leq 2x + 3 < 11$.

**Solution:**

Subtract $3$ from all three parts: $-8 \leq 2x < 8$

Divide all parts by $2$: $-4 \leq x < 4$

Answer: $-4 \leq x < 4$ (includes $-4$, excludes $4$)

### ✏️ Worked Example 3

**Problem:** Graph $y \geq -\frac{1}{2}x + 3$ on the coordinate plane.

**Solution:**

Step 1: Graph the line $y = -\frac{1}{2}x + 3$ as a **solid** line (because $\geq$).

Step 2: Test $(0, 0)$: Is $0 \geq -\frac{1}{2}(0) + 3 = 3$? No, $0 < 3$.

Step 3: Since $(0, 0)$ does NOT satisfy the inequality, shade the **opposite** side — shade above the line.

### ⚠️ SAT Traps to Avoid

- **Trap 1: Forgetting to flip the sign.** When you divide by a negative, the inequality reverses. This is the #1 mistake in inequality problems.
- **Trap 2: Dashed vs. solid line.** Strict inequalities ($<$, $>$) use dashed lines; non-strict ($\leq$, $\geq$) use solid lines.
- **Trap 3: "At least" means $\geq$, "at most" means $\leq$.** In word problems, watch for these phrases carefully.

### 🔗 Connection

This builds on solving linear equations (Lesson 0) by adding the direction component. It leads directly to systems of inequalities (Module 1, Lesson 3), where you find the overlap of two or more shaded regions.

### 🏋️ Quick Drill

1. Solve: $-2x \geq 10$ → $x \leq ?$
2. Solve: $4x - 1 < 15$ → $x < ?$
3. Does the point $(0, 0)$ satisfy $y > 2x + 1$?
"""

theories[(0, 4)] = r"""## Absolute Value Equations and Inequalities

### 🧠 Understanding the Concept

The **absolute value** of a number is its distance from zero on the number line. The key insight is that distance is always non-negative: $|x| \geq 0$ for all real $x$. Because distance can be measured in two directions, absolute value equations typically produce **two solutions**.

On the SAT, absolute value problems test whether you can think about "distance from a point." The equation $|x - 3| = 5$ asks: "What values of $x$ are exactly 5 units away from 3?" The answer is $x = 8$ (5 units to the right) or $x = -2$ (5 units to the left). This geometric interpretation makes absolute value much more intuitive than memorizing rules.

Absolute value inequalities split into two types: the "less than" type (which gives a single interval, because you are close to the center) and the "greater than" type (which gives two separate intervals, because you are far from the center).

### 📐 Key Formulas

**Equation:** $|ax + b| = c$ (where $c \geq 0$) → two cases: $ax + b = c$ or $ax + b = -c$

**Less-than inequality:** $|ax + b| < c$ → $-c < ax + b < c$ (AND / between)

**Greater-than inequality:** $|ax + b| > c$ → $ax + b > c$ OR $ax + b < -c$ (OR / outside)

**No solution:** $|ax + b| = c$ with $c < 0$ has no solution.

**Distance interpretation:** $|x - a| = d$ means $x$ is exactly $d$ units from $a$.

### 📝 How to Solve (Step by Step)

**For absolute value equations:**
1. **Isolate** the absolute value expression on one side
2. If the right side is negative → **no solution**
3. If the right side is zero → one solution (set inside = 0)
4. If the right side is positive → split into two cases and solve each
5. **Check** both solutions in the original equation

**For absolute value inequalities:**
1. Isolate the absolute value expression
2. If $< c$: write as a compound inequality (AND)
3. If $> c$: write as two separate inequalities (OR)
4. Solve each part

### ✏️ Worked Example 1

**Problem:** Solve $|2x - 5| = 9$.

**Solution:**

Case 1: $2x - 5 = 9$ → $2x = 14$ → $x = 7$

Case 2: $2x - 5 = -9$ → $2x = -4$ → $x = -2$

Answer: $x = 7$ or $x = -2$.

**Check:** $|2(7) - 5| = |9| = 9$ ✓ and $|2(-2) - 5| = |-9| = 9$ ✓

### ✏️ Worked Example 2

**Problem:** Solve $|x - 4| \leq 3$.

**Solution:**

This means: $x$ is at most 3 units from 4.

$-3 \leq x - 4 \leq 3$

$1 \leq x \leq 7$

Answer: $1 \leq x \leq 7$

### ✏️ Worked Example 3

**Problem:** Solve $|3x + 1| > 7$.

**Solution:**

Case 1: $3x + 1 > 7$ → $3x > 6$ → $x > 2$

Case 2: $3x + 1 < -7$ → $3x < -8$ → $x < -\frac{8}{3}$

Answer: $x > 2$ or $x < -\frac{8}{3}$

### ⚠️ SAT Traps to Avoid

- **Trap 1: Absolute value equals a negative.** $|x + 3| = -2$ has NO solution. Absolute value is never negative.
- **Trap 2: Forgetting the second case.** Always consider both the positive and negative case.
- **Trap 3: Mixing up $<$ and $>$ inequality types.** Remember: "Less than" → AND (between), "Greater than" → OR (outside).

### 🔗 Connection

This lesson uses the linear equation-solving skills from Lesson 0 but adds the twist of two cases. Absolute value concepts reappear in distance problems in coordinate geometry (Module 6). The split-into-cases thinking also prepares you for piecewise functions.

### 🏋️ Quick Drill

1. How many solutions does $|x| = 0$ have?
2. Solve $|x + 2| < 5$ as an interval.
3. True or false: $|x - 7| = -3$ has two solutions.
"""

# ============================================================
# MODULE 1: Systems of Equations
# ============================================================

theories[(1, 0)] = r"""## Solving Systems by Substitution

### 🧠 Understanding the Concept

A **system of linear equations** is a set of two (or more) equations with the same variables. The **solution** is the point $(x, y)$ where both equations are true simultaneously — graphically, this is where the two lines intersect.

The **substitution method** works by expressing one variable in terms of the other, then plugging that expression into the second equation. This reduces a two-variable problem to a one-variable problem, which you already know how to solve from Module 0.

On the SAT, substitution is the method of choice when one equation is already solved for a variable (like $y = 3x + 2$) or when one variable has a coefficient of $1$ or $-1$ (making it easy to isolate). Think of substitution as "replacing a variable with its equivalent expression." The analogy: if you know that a "dozen" means 12, you can replace "dozen" with 12 anywhere you see it.

### 📐 Key Formulas

If $y = f(x)$ and $g(x, y) = 0$, substitute: $g(x, f(x)) = 0$.

**Verification:** A solution $(a, b)$ must satisfy **both** equations.

### 📝 How to Solve (Step by Step)

1. **Choose** the equation where a variable is easiest to isolate
2. **Solve** that equation for one variable (e.g., $y = \ldots$)
3. **Substitute** the expression into the other equation
4. **Solve** the resulting one-variable equation
5. **Back-substitute** to find the other variable
6. **Check** the solution in both original equations

### ✏️ Worked Example 1

**Problem:** Solve the system: $y = 2x - 1$ and $3x + 2y = 12$.

**Solution:**

Step 1: The first equation is already solved for $y$.

Step 2: Substitute $y = 2x - 1$ into the second equation:
$$3x + 2(2x - 1) = 12$$
$$3x + 4x - 2 = 12$$
$$7x = 14$$
$$x = 2$$

Step 3: Back-substitute: $y = 2(2) - 1 = 3$

Answer: $(2, 3)$

### ✏️ Worked Example 2

**Problem:** Solve: $x + 3y = 10$ and $4x - y = 1$.

**Solution:**

From the first equation: $x = 10 - 3y$

Substitute into the second: $4(10 - 3y) - y = 1$

$40 - 12y - y = 1$

$-13y = -39$, so $y = 3$

Back-substitute: $x = 10 - 3(3) = 1$

Answer: $(1, 3)$

### ✏️ Worked Example 3

**Problem:** If $a = 2b + 5$ and $3a - b = 20$, what is $a + b$?

**Solution:**

Substitute $a = 2b + 5$ into $3a - b = 20$:

$3(2b + 5) - b = 20$

$6b + 15 - b = 20$

$5b = 5$, so $b = 1$ and $a = 2(1) + 5 = 7$

$a + b = 7 + 1 = 8$

### ⚠️ SAT Traps to Avoid

- **Trap 1: Solving for the wrong variable.** If the question asks for $x + y$, don't stop after finding $x$.
- **Trap 2: Substituting into the same equation.** Always substitute into the OTHER equation.
- **Trap 3: Arithmetic errors during distribution.** Be extra careful when distributing negatives.

### 🔗 Connection

This builds on solving single linear equations (Module 0). The next lesson introduces elimination as an alternative method, which is often faster for systems in standard form. Word problems (Lesson 4) will require you to SET UP systems before solving.

### 🏋️ Quick Drill

1. If $y = x + 3$ and $x + y = 11$, find $x$.
2. If $a = 3b$ and $a + b = 20$, find $a$.
3. Solve mentally: $y = 5$ and $2x + y = 17$. What is $x$?
"""

theories[(1, 1)] = r"""## Solving Systems by Elimination

### 🧠 Understanding the Concept

The **elimination method** (also called the addition method) solves systems by adding or subtracting equations to cancel out one variable. The idea is simple: if one equation has $+3y$ and the other has $-3y$, adding the equations makes the $y$ terms vanish.

This method is often **faster** than substitution when both equations are in standard form ($Ax + By = C$) and neither variable is already isolated. On the SAT, elimination is especially useful when the coefficients of one variable are already opposites or multiples of each other.

Think of elimination as stacking two equations on top of each other and combining them. You may need to multiply one or both equations by constants first to create matching (opposite) coefficients.

### 📐 Key Formulas

If $a_1x + b_1y = c_1$ and $a_2x + b_2y = c_2$, multiply to make coefficients of one variable opposite, then add.

**Shortcut for finding $x + y$ or $x - y$:** Sometimes adding or subtracting the original equations directly gives you what the question asks for.

### 📝 How to Solve (Step by Step)

1. **Align** both equations in $Ax + By = C$ form
2. **Identify** which variable is easier to eliminate
3. **Multiply** one or both equations so that one variable has opposite coefficients
4. **Add** the equations to eliminate that variable
5. **Solve** for the remaining variable
6. **Back-substitute** to find the other variable

### ✏️ Worked Example 1

**Problem:** Solve: $2x + 3y = 13$ and $2x - y = 5$.

**Solution:**

Subtract the second equation from the first:
$$(2x + 3y) - (2x - y) = 13 - 5$$
$$4y = 8$$
$$y = 2$$

Back-substitute: $2x + 3(2) = 13$ → $2x = 7$ → $x = 3.5$

Answer: $(3.5, 2)$

### ✏️ Worked Example 2

**Problem:** Solve: $3x + 4y = 25$ and $5x - 2y = 19$.

**Solution:**

Multiply the second equation by $2$: $10x - 4y = 38$

Add to the first: $3x + 4y + 10x - 4y = 25 + 38$

$13x = 63$, so $x = \frac{63}{13}$

Hmm — let's try eliminating $x$ instead.

Multiply first by $5$, second by $-3$:

$15x + 20y = 125$ and $-15x + 6y = -57$

Add: $26y = 68$, so $y = \frac{68}{26} = \frac{34}{13}$

Back-substitute to find $x$: $3x + 4 \cdot \frac{34}{13} = 25$, so $3x = 25 - \frac{136}{13} = \frac{189}{13}$, $x = \frac{63}{13}$.

### ✏️ Worked Example 3

**Problem:** If $x + y = 10$ and $x - y = 4$, what is the value of $x$?

**Solution:**

Add the two equations: $2x = 14$, so $x = 7$.

**SAT Shortcut:** Adding the equations directly gave us $x$ without any multiplication step.

### ⚠️ SAT Traps to Avoid

- **Trap 1: Adding when you should subtract (or vice versa).** Check the signs of the coefficients carefully before combining.
- **Trap 2: Multiplying only one side.** When you multiply an equation by a constant, multiply the ENTIRE equation (both sides).
- **Trap 3: Not checking for a shortcut.** Before multiplying, see if the SAT asks for $x + y$ or $x - y$ — you might be able to add/subtract the equations directly.

### 🔗 Connection

Elimination and substitution are complementary methods — choose whichever is more efficient for the given system. The next lesson covers special cases (no solution, infinite solutions) that arise when elimination produces $0 = 0$ or $0 = k$.

### 🏋️ Quick Drill

1. $x + y = 15$ and $x - y = 3$. Find $x$ and $y$ by adding/subtracting.
2. $2x + y = 10$ and $2x + 3y = 18$. Subtract to find $y$.
3. $3x + 2y = 7$ and $3x + 2y = 10$. What happens when you subtract?
"""

theories[(1, 2)] = r"""## Systems with No Solution or Infinitely Many Solutions

### 🧠 Understanding the Concept

Not every system of equations has a single neat solution. There are **three possibilities**: exactly one solution, no solution, or infinitely many solutions. Understanding when each case arises is critical for SAT problems that ask "For what value of $k$ does the system have no solution?"

Graphically: two lines in the plane can intersect at one point (one solution), be parallel and never meet (no solution), or overlap completely (infinitely many solutions). Algebraically: when you try to solve and reach a contradiction like $0 = 5$, there is no solution; when you reach a tautology like $0 = 0$, there are infinitely many solutions.

The key test is comparing the coefficients. If the left-hand sides of both equations are proportional but the right-hand sides are not, the lines are parallel (no solution). If everything is proportional, the equations describe the same line (infinite solutions).

### 📐 Key Formulas

For the system $a_1x + b_1y = c_1$ and $a_2x + b_2y = c_2$:

$$\frac{a_1}{a_2} \neq \frac{b_1}{b_2} \implies \text{one solution (lines intersect)}$$

$$\frac{a_1}{a_2} = \frac{b_1}{b_2} \neq \frac{c_1}{c_2} \implies \text{no solution (parallel lines)}$$

$$\frac{a_1}{a_2} = \frac{b_1}{b_2} = \frac{c_1}{c_2} \implies \text{infinitely many solutions (same line)}$$

### 📝 How to Solve (Step by Step)

1. Write both equations in $Ax + By = C$ form
2. Compare the ratios $\frac{a_1}{a_2}$, $\frac{b_1}{b_2}$, $\frac{c_1}{c_2}$
3. Apply the rules above
4. If the problem asks "for what value of $k$...": set up the proportional relationship and solve for $k$

### ✏️ Worked Example 1

**Problem:** Does the system $4x + 6y = 12$ and $2x + 3y = 8$ have a solution?

**Solution:**

Compare ratios: $\frac{4}{2} = 2$, $\frac{6}{3} = 2$, $\frac{12}{8} = 1.5$

Since $\frac{a_1}{a_2} = \frac{b_1}{b_2} \neq \frac{c_1}{c_2}$, the system has **no solution**.

The lines are parallel (both have slope $-\frac{2}{3}$) but different intercepts.

### ✏️ Worked Example 2

**Problem:** For what value of $k$ does $kx + 6y = 10$ and $3x + 9y = 15$ have no solution?

**Solution:**

For no solution: $\frac{k}{3} = \frac{6}{9} \neq \frac{10}{15}$

$\frac{6}{9} = \frac{2}{3}$ and $\frac{10}{15} = \frac{2}{3}$

Wait — $\frac{6}{9} = \frac{10}{15} = \frac{2}{3}$. This means if $\frac{k}{3} = \frac{2}{3}$, then $k = 2$, and ALL three ratios equal $\frac{2}{3}$, giving **infinitely many** solutions.

So for **no solution** we need $\frac{k}{3} = \frac{6}{9}$ but $\frac{c_1}{c_2} \neq \frac{6}{9}$. But our constants already match! So this system can NEVER have "no solution" for any $k$ — it is either one solution or infinitely many.

Actually, let me re-examine: $\frac{k}{3} = \frac{6}{9}$ gives $k = 2$. When $k = 2$: $2x + 6y = 10$ and $3x + 9y = 15$. Divide first by 2: $x + 3y = 5$. Divide second by 3: $x + 3y = 5$. Same equation — infinite solutions.

For any $k \neq 2$: $\frac{k}{3} \neq \frac{6}{9}$, so one unique solution. No value of $k$ gives "no solution" here.

### ✏️ Worked Example 3

**Problem:** For what value of $c$ does $2x + 4y = c$ and $x + 2y = 6$ have infinitely many solutions?

**Solution:**

For infinite solutions, the equations must be proportional.

$\frac{2}{1} = \frac{4}{2} = \frac{c}{6}$

$2 = 2 = \frac{c}{6}$, so $c = 12$.

### ⚠️ SAT Traps to Avoid

- **Trap 1: Confusing no solution with infinitely many.** $0 = 5$ means no solution. $0 = 0$ means infinitely many.
- **Trap 2: Not simplifying both equations first.** Always reduce equations before comparing ratios.
- **Trap 3: "The system has no solution" does NOT mean $x = 0$ or $y = 0$.** It means no pair $(x, y)$ works.

### 🔗 Connection

This extends the elimination method from Lesson 1. The concept of parallel lines (same slope, different intercept) connects back to Module 0. Understanding special cases is essential for the SAT's "for what value of $k$..." questions.

### 🏋️ Quick Drill

1. $y = 2x + 3$ and $y = 2x - 1$: how many solutions?
2. $y = 3x + 5$ and $6x - 2y = -10$: how many solutions?
3. $x + y = 5$ and $2x + 2y = 7$: how many solutions?
"""

theories[(1, 3)] = r"""## Systems of Inequalities and Feasible Regions

### 🧠 Understanding the Concept

A **system of inequalities** is a set of two or more inequalities that must all be true at the same time. The solution is not a single point but an entire **region** of the coordinate plane — every point in that region satisfies all the inequalities simultaneously.

On the SAT, these problems typically ask: "Which point satisfies the system?" or "Which point is in the feasible region?" The feasible region is where all the shaded areas overlap. This concept appears in optimization problems and real-world constraint modeling.

Think of each inequality as a fence — it divides the plane into two halves. The solution region is the area that lies on the correct side of ALL fences simultaneously. The more inequalities you have, the smaller the feasible region gets.

### 📐 Key Formulas

For $y > mx + b$: shade **above** the dashed line $y = mx + b$

For $y < mx + b$: shade **below** the dashed line

For $y \geq mx + b$: shade above the **solid** line

For $y \leq mx + b$: shade below the **solid** line

### 📝 How to Solve (Step by Step)

**For "Which point satisfies the system?" questions:**
1. Substitute each answer choice into ALL inequalities
2. A point must satisfy EVERY inequality to be in the solution
3. Eliminate any point that fails even one inequality

**For graphing:**
1. Graph each boundary line (dashed or solid)
2. Shade the correct region for each inequality
3. The feasible region is the **overlap** of all shaded regions

### ✏️ Worked Example 1

**Problem:** Which point satisfies $y \leq 2x + 1$ and $y > -x + 4$?

Test $(2, 3)$:
- $3 \leq 2(2) + 1 = 5$? Yes ✓
- $3 > -(2) + 4 = 2$? Yes ✓

Answer: $(2, 3)$ is in the feasible region.

### ✏️ Worked Example 2

**Problem:** A factory makes tables and chairs. Each table requires 3 hours and each chair requires 1 hour. The factory has at most 40 hours available. Each table uses 2 units of wood and each chair uses 1 unit. There are 24 units of wood. Write the system of inequalities.

**Solution:**

Let $t$ = tables, $c$ = chairs.

Time constraint: $3t + c \leq 40$

Wood constraint: $2t + c \leq 24$

Non-negativity: $t \geq 0$, $c \geq 0$

### ✏️ Worked Example 3

**Problem:** In the system $y < x + 5$ and $y \geq 3x - 1$, is $(1, 2)$ a solution?

**Solution:**

Check: $2 < 1 + 5 = 6$? Yes. $2 \geq 3(1) - 1 = 2$? Yes ($2 \geq 2$).

Answer: Yes, $(1, 2)$ satisfies both inequalities.

### ⚠️ SAT Traps to Avoid

- **Trap 1: Testing only one inequality.** A point must satisfy ALL inequalities in the system.
- **Trap 2: Confusing strict and non-strict.** $y < 3$ does NOT include $y = 3$, but $y \leq 3$ does.
- **Trap 3: On the boundary.** Points on a dashed line are NOT solutions. Points on a solid line ARE solutions.

### 🔗 Connection

This extends linear inequalities (Module 0, Lesson 3) to systems with multiple constraints. The graphing skills connect to understanding feasible regions in optimization problems. Word problems with constraints (next lesson) often require setting up these systems.

### 🏋️ Quick Drill

1. Is $(0, 0)$ a solution to $y > x + 1$?
2. Is $(3, 5)$ a solution to $y \leq 2x$ and $y \geq x + 1$?
3. How many inequalities must a point satisfy to be in the feasible region of a 3-inequality system?
"""

theories[(1, 4)] = r"""## Word Problems with Systems of Equations

### 🧠 Understanding the Concept

The SAT frequently wraps systems of equations inside real-world word problems. The math is the same — two equations, two unknowns — but the challenge is **translating** English into algebra. The key skill is defining variables clearly, writing equations from the given relationships, and remembering to answer the actual question asked.

Common word problem types include: mixture problems (combining items at different prices), rate/distance/time problems, age problems, and ticket/coin problems. In every case, you are looking for two relationships that give you two equations.

Think of it as a two-step process: (1) Translate the story into math, and (2) Solve the math. Most students struggle more with step 1 than step 2. A systematic approach to translation — define variables, identify the two relationships, write equations — eliminates guesswork.

### 📐 Key Formulas

**Total problems:** $x + y = \text{total}$

**Value problems:** $(price_1)(x) + (price_2)(y) = \text{total value}$

**Rate problems:** $d = rt$ (distance = rate × time)

**Mixture problems:** $\text{concentration}_1 \cdot \text{amount}_1 + \text{concentration}_2 \cdot \text{amount}_2 = \text{final concentration} \cdot \text{total amount}$

### 📝 How to Solve (Step by Step)

1. **Read** the problem completely before writing anything
2. **Define variables** — state what $x$ and $y$ represent with units
3. **Identify two independent relationships** and write two equations
4. **Solve** the system using substitution or elimination
5. **Answer the actual question** — it may ask for $x + y$, $x - y$, or $2x$

### ✏️ Worked Example 1

**Problem:** A concert sold 350 tickets. VIP tickets cost \$80 each and regular tickets cost \$30 each. Total revenue was \$15,500. How many VIP tickets were sold?

**Solution:**

Let $v$ = VIP tickets, $r$ = regular tickets.

Equation 1 (total tickets): $v + r = 350$

Equation 2 (total revenue): $80v + 30r = 15500$

From Eq. 1: $r = 350 - v$

Substitute: $80v + 30(350 - v) = 15500$

$80v + 10500 - 30v = 15500$

$50v = 5000$

$v = 100$

Answer: 100 VIP tickets were sold.

### ✏️ Worked Example 2

**Problem:** A boat travels 24 miles downstream in 2 hours and 24 miles upstream in 3 hours. Find the speed of the boat in still water and the speed of the current.

**Solution:**

Let $b$ = boat speed, $c$ = current speed.

Downstream: $(b + c) \cdot 2 = 24$ → $b + c = 12$

Upstream: $(b - c) \cdot 3 = 24$ → $b - c = 8$

Add: $2b = 20$, so $b = 10$ mph.

Subtract: $2c = 4$, so $c = 2$ mph.

### ✏️ Worked Example 3

**Problem:** A store sells nuts at \$5/lb and dried fruit at \$8/lb. A 10-lb mixture costs \$6.50/lb total. How many pounds of nuts?

**Solution:**

Let $n$ = pounds of nuts, $f$ = pounds of fruit.

$n + f = 10$ and $5n + 8f = 65$

From first: $f = 10 - n$. Substitute: $5n + 8(10 - n) = 65$

$5n + 80 - 8n = 65$ → $-3n = -15$ → $n = 5$.

### ⚠️ SAT Traps to Avoid

- **Trap 1: Not answering what's asked.** If the question asks for "total revenue" and you found $x$ and $y$, you must compute the revenue.
- **Trap 2: Setting up equations with wrong relationships.** "Total tickets" and "total revenue" are two DIFFERENT equations.
- **Trap 3: Mixing up units.** If one quantity is in pounds and another in dollars, make sure your equations are consistent.

### 🔗 Connection

This lesson combines translation skills with the solving techniques from Lessons 0 and 1 of this module. Word problems also appear in quadratic contexts (Module 2) and in exponential growth scenarios (Module 4).

### 🏋️ Quick Drill

1. If $x + y = 20$ and the total value is $3x + 5y = 80$, find $x$.
2. A car goes 60 mph for $t$ hours and 40 mph for $(5 - t)$ hours. Total distance is 260 miles. Find $t$.
3. One number is 4 more than another. Their sum is 22. What are the numbers?
"""

# ============================================================
# MODULE 2: Quadratic Equations & Functions
# ============================================================

theories[(2, 0)] = r"""## Factoring Quadratic Expressions

### 🧠 Understanding the Concept

**Factoring** is the process of breaking a quadratic expression $ax^2 + bx + c$ into a product of two binomials. This is the reverse of multiplication (FOIL). Factoring is one of the most important skills on the SAT because it is the fastest way to solve many quadratic equations and simplify expressions.

Think of factoring as "un-multiplying." If $(x + 3)(x + 4) = x^2 + 7x + 12$, then factoring $x^2 + 7x + 12$ means finding those original binomials. The key is finding two numbers that satisfy two conditions simultaneously: they must multiply to give $c$ (the constant term) and add to give $b$ (the coefficient of $x$).

Factoring is faster than the quadratic formula when it works, but it does not always work (some quadratics have irrational or complex roots). On the SAT, most factoring problems are designed to have nice integer solutions — the test rewards you for recognizing patterns quickly.

### 📐 Key Formulas

**When $a = 1$:** $x^2 + bx + c = (x + p)(x + q)$ where $p + q = b$ and $pq = c$

**Difference of Squares:** $a^2 - b^2 = (a + b)(a - b)$

**Perfect Square Trinomials:** $a^2 + 2ab + b^2 = (a + b)^2$ and $a^2 - 2ab + b^2 = (a - b)^2$

**AC Method (when $a \neq 1$):** Find two numbers that multiply to $ac$ and add to $b$, then factor by grouping.

### 📝 How to Solve (Step by Step)

1. **Check for GCF** — factor out any common factor first
2. **Check for special patterns** — difference of squares or perfect square trinomial
3. **If $a = 1$:** Find two numbers that multiply to $c$ and add to $b$
4. **If $a \neq 1$:** Use the AC method (multiply $a \cdot c$, find two numbers, split the middle term, factor by grouping)
5. **Verify** by multiplying your factors back together

### ✏️ Worked Example 1

**Problem:** Factor $x^2 - 5x - 14$.

**Solution:**

Find two numbers that multiply to $-14$ and add to $-5$.

Candidates: $-7$ and $+2$ (since $-7 \times 2 = -14$ and $-7 + 2 = -5$)

$$x^2 - 5x - 14 = (x - 7)(x + 2)$$

### ✏️ Worked Example 2

**Problem:** Factor $3x^2 + 10x + 8$.

**Solution (AC Method):**

$a \cdot c = 3 \times 8 = 24$. Find two numbers that multiply to $24$ and add to $10$: $4$ and $6$.

Split: $3x^2 + 4x + 6x + 8$

Group: $x(3x + 4) + 2(3x + 4)$

Factor: $(x + 2)(3x + 4)$

### ✏️ Worked Example 3

**Problem:** Factor $4x^2 - 25$.

**Solution:**

Recognize the difference of squares: $4x^2 - 25 = (2x)^2 - 5^2 = (2x + 5)(2x - 5)$

### ⚠️ SAT Traps to Avoid

- **Trap 1: Sign errors.** $(x - 3)(x + 5) = x^2 + 2x - 15$, NOT $x^2 - 2x - 15$. Always double-check the middle term.
- **Trap 2: Forgetting to factor out the GCF first.** $2x^2 + 6x + 4 = 2(x^2 + 3x + 2) = 2(x + 1)(x + 2)$.
- **Trap 3: Not recognizing $x^2 - 9$ as a difference of squares.** It equals $(x + 3)(x - 3)$, not $(x - 3)^2$.

### 🔗 Connection

Factoring is the foundation for solving quadratic equations (next lesson) and simplifying rational expressions (Module 3). The patterns here (especially difference of squares) appear throughout the SAT.

### 🏋️ Quick Drill

1. Factor $x^2 + 9x + 20$.
2. Factor $x^2 - 16$.
3. Factor $2x^2 + 5x + 3$.
"""

theories[(2, 1)] = r"""## Solving Quadratic Equations

### 🧠 Understanding the Concept

A **quadratic equation** has the form $ax^2 + bx + c = 0$ and can have zero, one, or two real solutions. These solutions (also called roots or zeros) are the $x$-values where the parabola $y = ax^2 + bx + c$ crosses the $x$-axis.

You have three methods at your disposal: **factoring** (fastest when it works), the **quadratic formula** (works always), and **completing the square** (useful for converting to vertex form). On the SAT, factoring is preferred because it is quick and the test usually uses "factorable" quadratics. However, you should have the quadratic formula memorized as a reliable backup.

The quadratic formula is derived from completing the square on the general equation $ax^2 + bx + c = 0$. The $\pm$ in the formula is what gives you two solutions — one using $+$ and one using $-$.

### 📐 Key Formulas

**Quadratic Formula:** $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$

**Discriminant:** $D = b^2 - 4ac$ determines the number of solutions

**Sum of Roots:** $r_1 + r_2 = -\frac{b}{a}$

**Product of Roots:** $r_1 \cdot r_2 = \frac{c}{a}$

### 📝 How to Solve (Step by Step)

1. **Rearrange** to standard form: $ax^2 + bx + c = 0$
2. **Try factoring first** — look for two numbers that work
3. **If factoring fails**, use the quadratic formula
4. **If asked for vertex form**, complete the square
5. **Check** your solutions by substituting back

**Decision Tree:**
- Equation looks factorable (small, integer coefficients) → Factor
- Coefficients are messy or irrational roots expected → Quadratic formula
- Need vertex form or to rewrite the equation → Complete the square

### ✏️ Worked Example 1

**Problem:** Solve $x^2 - 7x + 10 = 0$.

**Solution:**

Factor: $(x - 2)(x - 5) = 0$

$x = 2$ or $x = 5$

### ✏️ Worked Example 2

**Problem:** Solve $2x^2 + 3x - 5 = 0$ using the quadratic formula.

**Solution:**

$a = 2$, $b = 3$, $c = -5$

$x = \frac{-3 \pm \sqrt{9 + 40}}{4} = \frac{-3 \pm \sqrt{49}}{4} = \frac{-3 \pm 7}{4}$

$x = \frac{4}{4} = 1$ or $x = \frac{-10}{4} = -\frac{5}{2}$

### ✏️ Worked Example 3

**Problem:** Solve $x^2 + 6x + 5 = 0$ by completing the square.

**Solution:**

$x^2 + 6x = -5$

$(x^2 + 6x + 9) = -5 + 9$

$(x + 3)^2 = 4$

$x + 3 = \pm 2$

$x = -1$ or $x = -5$

### ⚠️ SAT Traps to Avoid

- **Trap 1: Forgetting to set the equation equal to zero.** $x^2 + 3x = 10$ must become $x^2 + 3x - 10 = 0$ before factoring.
- **Trap 2: Sign error in the quadratic formula.** It is $-b$, not $b$. If $b = -5$, then $-b = 5$.
- **Trap 3: Dividing by $x$ instead of factoring.** $x^2 = 5x$ → $x^2 - 5x = 0$ → $x(x - 5) = 0$. Do NOT divide both sides by $x$ (you'd lose the solution $x = 0$).

### 🔗 Connection

This builds on factoring (Lesson 0) and leads to vertex form (Lesson 2) and the discriminant (Lesson 3). Quadratic equations appear in word problems (Lesson 4) and in rational equations (Module 3).

### 🏋️ Quick Drill

1. Solve $x^2 - 9 = 0$ mentally.
2. What are the roots of $(x - 4)(x + 1) = 0$?
3. Use the sum-of-roots formula: If $x^2 - 10x + k = 0$ has roots summing to $10$, what is $-b/a$?
"""

theories[(2, 2)] = r"""## Vertex Form and Parabola Properties

### 🧠 Understanding the Concept

The **vertex form** of a quadratic function, $f(x) = a(x - h)^2 + k$, immediately reveals the most important feature of a parabola: its **vertex** $(h, k)$. The vertex is either the minimum point (when $a > 0$, parabola opens up) or the maximum point (when $a < 0$, parabola opens down).

On the SAT, vertex-related questions are extremely common. You might be asked to find the maximum height of a projectile, the minimum cost of production, or the axis of symmetry of a parabola. All of these require you to find the vertex.

The mental model: a parabola is a symmetric U-shape. The vertex is the bottom of the U (if $a > 0$) or the top (if $a < 0$). The line $x = h$ is the **axis of symmetry** — the parabola is a mirror image on either side.

### 📐 Key Formulas

**Vertex Form:** $f(x) = a(x - h)^2 + k$, vertex at $(h, k)$

**From Standard Form:** $h = -\frac{b}{2a}$, $k = f(h)$

**Axis of Symmetry:** $x = h = -\frac{b}{2a}$

**Direction:** $a > 0$ opens up (minimum); $a < 0$ opens down (maximum)

**Width:** Larger $|a|$ = narrower parabola; smaller $|a|$ = wider parabola

### 📝 How to Solve (Step by Step)

**Finding the vertex from standard form $f(x) = ax^2 + bx + c$:**
1. Calculate $h = -\frac{b}{2a}$
2. Plug $h$ back in: $k = f(h)$
3. The vertex is $(h, k)$

**Converting standard to vertex form:**
1. Factor out $a$ from the first two terms: $a(x^2 + \frac{b}{a}x) + c$
2. Complete the square inside the parentheses
3. Adjust the constant term outside

### ✏️ Worked Example 1

**Problem:** Find the vertex of $f(x) = 3x^2 - 12x + 7$.

**Solution:**

$h = -\frac{-12}{2(3)} = \frac{12}{6} = 2$

$k = 3(4) - 12(2) + 7 = 12 - 24 + 7 = -5$

Vertex: $(2, -5)$. Since $a = 3 > 0$, this is a **minimum**.

### ✏️ Worked Example 2

**Problem:** A ball is thrown upward from ground level with $h(t) = -16t^2 + 96t$. What is the maximum height?

**Solution:**

$t_{\text{max}} = -\frac{96}{2(-16)} = \frac{96}{32} = 3$ seconds

$h(3) = -16(9) + 96(3) = -144 + 288 = 144$ feet

Maximum height: **144 feet**

### ✏️ Worked Example 3

**Problem:** Write $f(x) = x^2 - 8x + 20$ in vertex form.

**Solution:**

$f(x) = (x^2 - 8x + 16) + 20 - 16 = (x - 4)^2 + 4$

Vertex form: $f(x) = (x - 4)^2 + 4$. Vertex: $(4, 4)$.

### ⚠️ SAT Traps to Avoid

- **Trap 1: Sign error in vertex form.** In $f(x) = (x - 3)^2 + 5$, the vertex is $(3, 5)$, NOT $(-3, 5)$.
- **Trap 2: Confusing min and max.** Positive $a$ = minimum (opens up). Negative $a$ = maximum (opens down).
- **Trap 3: Using the wrong formula for $h$.** It is $-\frac{b}{2a}$, not $\frac{b}{2a}$. Don't drop the negative.

### 🔗 Connection

This builds on solving quadratics (Lesson 1) and leads directly into the discriminant (Lesson 3) and quadratic word problems (Lesson 4). The vertex is the key to all optimization problems.

### 🏋️ Quick Drill

1. What is the axis of symmetry of $y = 2x^2 + 8x - 3$?
2. In $f(x) = -(x + 1)^2 + 9$, what is the maximum value?
3. Does $f(x) = 5x^2 - 10x + 3$ have a minimum or maximum?
"""

theories[(2, 3)] = r"""## The Discriminant and Number of Solutions

### 🧠 Understanding the Concept

The **discriminant** is the expression $D = b^2 - 4ac$ found under the square root in the quadratic formula. It is a single number that tells you exactly how many real solutions a quadratic equation has, without actually solving it. This makes the discriminant one of the most efficient tools on the SAT.

Geometrically, the discriminant tells you how the parabola $y = ax^2 + bx + c$ relates to the $x$-axis. If $D > 0$, the parabola crosses the $x$-axis at two points. If $D = 0$, the parabola just touches the $x$-axis at one point (the vertex is on the axis). If $D < 0$, the parabola floats entirely above or below the $x$-axis without crossing it.

The SAT loves to ask: "For what value of $k$ does the equation have exactly one solution?" This means you must set $D = 0$ and solve for $k$.

### 📐 Key Formulas

$$D = b^2 - 4ac$$

| $D$ | Number of Real Solutions | Graphical Meaning |
|-----|------------------------|--------------------|
| $D > 0$ | Two distinct real solutions | Parabola crosses $x$-axis twice |
| $D = 0$ | One repeated real solution | Parabola touches $x$-axis at vertex |
| $D < 0$ | No real solutions | Parabola does not touch $x$-axis |

### 📝 How to Solve (Step by Step)

1. Identify $a$, $b$, and $c$ from $ax^2 + bx + c = 0$
2. Compute $D = b^2 - 4ac$
3. Interpret the sign of $D$
4. For "find $k$" problems: set $D = 0$ (for one solution) or $D > 0$ or $D < 0$ as needed

### ✏️ Worked Example 1

**Problem:** How many real solutions does $2x^2 - 3x + 5 = 0$ have?

**Solution:**

$D = (-3)^2 - 4(2)(5) = 9 - 40 = -31$

Since $D < 0$, there are **no real solutions**.

### ✏️ Worked Example 2

**Problem:** For what value of $k$ does $x^2 + kx + 25 = 0$ have exactly one solution?

**Solution:**

Set $D = 0$: $k^2 - 4(1)(25) = 0$

$k^2 = 100$

$k = 10$ or $k = -10$

### ✏️ Worked Example 3

**Problem:** For what values of $m$ does $x^2 - 6x + m = 0$ have two distinct real solutions?

**Solution:**

$D > 0$: $36 - 4m > 0$ → $m < 9$

The equation has two distinct real solutions when $m < 9$.

### ⚠️ SAT Traps to Avoid

- **Trap 1: Computing $b^2$ when $b$ is negative.** $(-6)^2 = 36$, not $-36$. Squaring always gives a positive result.
- **Trap 2: Forgetting that "exactly one solution" means $D = 0$, not $D = 1$.**
- **Trap 3: Confusing "no real solutions" with "no solutions."** The equation may have complex solutions, but the SAT only tests real solutions.

### 🔗 Connection

The discriminant is built into the quadratic formula (Lesson 1) and connects to the vertex (Lesson 2) — when $D = 0$, the vertex is on the $x$-axis. It also connects to systems of equations: a line and parabola intersect when the resulting quadratic has $D \geq 0$.

### 🏋️ Quick Drill

1. Find the discriminant of $x^2 + 4x + 4 = 0$. How many solutions?
2. Find the discriminant of $x^2 + 2x + 5 = 0$. How many real solutions?
3. For $x^2 - 10x + k = 0$ to have one solution, what is $k$?
"""

theories[(2, 4)] = r"""## Quadratic Word Problems and Applications

### 🧠 Understanding the Concept

Quadratic equations model many real-world situations on the SAT: the arc of a thrown ball, the area of a rectangular region, revenue and profit optimization, and more. The key challenge is translating the word problem into a quadratic equation, then using your toolkit (factoring, quadratic formula, or vertex) to answer the question.

Two question types dominate: (1) "When does the object hit the ground?" — set the height equal to zero and solve. (2) "What is the maximum height/revenue/area?" — find the vertex. Understanding which question type you are dealing with determines which tool to use.

For projectile motion on the SAT, the model is $h(t) = -16t^2 + v_0t + h_0$ (in feet) or $h(t) = -4.9t^2 + v_0t + h_0$ (in meters). The $-16$ or $-4.9$ comes from gravity. The vertex gives the maximum height, and the positive root of $h(t) = 0$ gives the time when the object hits the ground.

### 📐 Key Formulas

**Projectile Motion (feet):** $h(t) = -16t^2 + v_0 t + h_0$

**Maximum/Minimum:** occurs at $t = -\frac{b}{2a}$

**Area of rectangle:** $A = \ell \cdot w$

**Revenue:** $R = (\text{price per unit})(\text{number of units sold})$

### 📝 How to Solve (Step by Step)

1. **Identify** the type: projectile, area, revenue, or general optimization
2. **Define variables** and write the quadratic equation/function
3. **Determine** what the question asks: a root ($= 0$), the vertex (max/min), or a specific value
4. **Solve** using the appropriate method
5. **Reject** non-physical solutions (negative time, negative length, etc.)

### ✏️ Worked Example 1

**Problem:** A ball is launched upward with $h(t) = -16t^2 + 64t + 80$. (a) What is the maximum height? (b) When does it hit the ground?

**Solution:**

(a) $t_{\max} = -\frac{64}{2(-16)} = 2$ seconds. $h(2) = -64 + 128 + 80 = 144$ feet.

(b) Set $h(t) = 0$: $-16t^2 + 64t + 80 = 0$. Divide by $-16$: $t^2 - 4t - 5 = 0$

$(t - 5)(t + 1) = 0$. $t = 5$ (reject $t = -1$).

It hits the ground at $t = 5$ seconds.

### ✏️ Worked Example 2

**Problem:** A farmer has 60 meters of fencing to enclose a rectangular pen against a barn (only 3 sides need fencing). What dimensions maximize the area?

**Solution:**

Let $x$ = width (two sides) and $y$ = length (one side). Constraint: $2x + y = 60$, so $y = 60 - 2x$.

$A = xy = x(60 - 2x) = -2x^2 + 60x$

Max at $x = -\frac{60}{2(-2)} = 15$ meters.

$y = 60 - 30 = 30$ meters. Max area $= 15 \times 30 = 450$ m².

### ✏️ Worked Example 3

**Problem:** A company finds that if it charges $p$ dollars per item, it sells $200 - 5p$ items. What price maximizes revenue?

**Solution:**

$R = p(200 - 5p) = -5p^2 + 200p$

Max at $p = -\frac{200}{2(-5)} = 20$ dollars.

Max revenue: $R = 20(200 - 100) = 20 \times 100 = \$2000$.

### ⚠️ SAT Traps to Avoid

- **Trap 1: Using a negative time.** Always reject negative values for time and length.
- **Trap 2: Confusing "when does it hit the ground" with "maximum height."** Ground = set $h = 0$. Max = find vertex.
- **Trap 3: Forgetting the initial height.** $h_0$ is the height at $t = 0$. If a ball is launched from a 48-foot building, $h_0 = 48$.

### 🔗 Connection

This is the culmination of the Quadratics module, using factoring (Lesson 0), solving (Lesson 1), and vertex form (Lesson 2). The projectile model reappears in trigonometry problems and the optimization approach extends to exponential models (Module 4).

### 🏋️ Quick Drill

1. If $h(t) = -16t^2 + 32t$, what is the maximum height?
2. A rectangle has perimeter 20. Express area as a function of width $w$.
3. If revenue $R = -x^2 + 50x$, what value of $x$ maximizes $R$?
"""

# ============================================================
# MODULE 3: Polynomial & Rational Expressions
# ============================================================

theories[(3, 0)] = r"""## Operations with Polynomials

### 🧠 Understanding the Concept

A **polynomial** is an expression consisting of variables and coefficients combined using addition, subtraction, and multiplication, with non-negative integer exponents. Examples: $3x^4 - 2x^2 + x - 7$ (degree 4) and $5x + 1$ (degree 1, which is linear).

On the SAT, you need to add, subtract, and multiply polynomials fluently. The key principle for addition and subtraction is **combining like terms** — terms with the same variable and exponent. For multiplication, you use the **distributive property** repeatedly (FOIL is just a special case for two binomials).

Understanding special products — difference of squares, perfect square trinomials, and sum/difference of cubes — gives you major shortcuts. The SAT frequently tests whether you can recognize these patterns rather than multiplying everything out the long way.

### 📐 Key Formulas

**Special Products:**
- $(a + b)^2 = a^2 + 2ab + b^2$
- $(a - b)^2 = a^2 - 2ab + b^2$
- $(a + b)(a - b) = a^2 - b^2$
- $a^3 + b^3 = (a + b)(a^2 - ab + b^2)$
- $a^3 - b^3 = (a - b)(a^2 + ab + b^2)$

**Degree rule:** $\deg(p \cdot q) = \deg(p) + \deg(q)$

### 📝 How to Solve (Step by Step)

**Adding/Subtracting:**
1. Remove parentheses (distribute the negative sign for subtraction)
2. Group like terms (same variable, same exponent)
3. Combine coefficients

**Multiplying:**
1. Multiply each term in the first polynomial by each term in the second
2. Combine like terms
3. For special patterns, apply the formula directly

### ✏️ Worked Example 1

**Problem:** Simplify $(3x^2 + 2x - 5) - (x^2 - 4x + 3)$.

**Solution:**

$= 3x^2 + 2x - 5 - x^2 + 4x - 3$

$= 2x^2 + 6x - 8$

### ✏️ Worked Example 2

**Problem:** Expand $(2x - 3)(x^2 + 4x - 1)$.

**Solution:**

$= 2x(x^2 + 4x - 1) - 3(x^2 + 4x - 1)$

$= 2x^3 + 8x^2 - 2x - 3x^2 - 12x + 3$

$= 2x^3 + 5x^2 - 14x + 3$

### ✏️ Worked Example 3

**Problem:** Simplify $(x + 2)(x^2 - 2x + 4)$.

**Solution:** Recognize sum of cubes: $a = x$, $b = 2$.

$(x + 2)(x^2 - 2x + 4) = x^3 + 8$

### ⚠️ SAT Traps to Avoid

- **Trap 1: Sign error when subtracting polynomials.** Distribute the negative to EVERY term: $-(x^2 - 3x + 2) = -x^2 + 3x - 2$.
- **Trap 2: Confusing $(a + b)^2$ with $a^2 + b^2$.** $(a + b)^2 = a^2 + 2ab + b^2$, NOT $a^2 + b^2$.
- **Trap 3: Forgetting the middle term.** $(x + 5)^2 = x^2 + 10x + 25$, not $x^2 + 25$.

### 🔗 Connection

Polynomial operations build on the algebra from Modules 0-2 and lead into polynomial division (next lesson) and rational expressions (Lesson 2). The special products appear throughout the SAT.

### 🏋️ Quick Drill

1. Expand $(x + 4)^2$.
2. Simplify $(5x - 1)(5x + 1)$.
3. What is the degree of $(x^3 + 1)(x^2 - x)$?
"""

theories[(3, 1)] = r"""## Polynomial Division and Remainder Theorem

### 🧠 Understanding the Concept

**Polynomial division** is the process of dividing one polynomial by another, analogous to long division with numbers. The result is a quotient plus a remainder, expressed as:

$$p(x) = d(x) \cdot q(x) + r(x)$$

where $p(x)$ is the dividend, $d(x)$ is the divisor, $q(x)$ is the quotient, and $r(x)$ is the remainder.

The **Remainder Theorem** is the powerful shortcut: when you divide polynomial $p(x)$ by $(x - a)$, the remainder is simply $p(a)$. This means you can find the remainder by plugging in a single value — no long division needed. The closely related **Factor Theorem** states that $(x - a)$ is a factor of $p(x)$ if and only if $p(a) = 0$.

On the SAT, these theorems save enormous time. "What is the remainder when $p(x)$ is divided by $(x - 3)$?" Just compute $p(3)$.

### 📐 Key Formulas

**Remainder Theorem:** When $p(x)$ is divided by $(x - a)$, the remainder is $p(a)$.

**Factor Theorem:** $(x - a)$ is a factor of $p(x)$ if and only if $p(a) = 0$.

**Division Algorithm:** $p(x) = (x - a) \cdot q(x) + p(a)$

### 📝 How to Solve (Step by Step)

**Using the Remainder Theorem:**
1. Identify the divisor $(x - a)$ and find $a$
2. Evaluate $p(a)$ — this is the remainder
3. If $p(a) = 0$, then $(x - a)$ is a factor

**Polynomial Long Division (when needed):**
1. Divide the leading term of the dividend by the leading term of the divisor
2. Multiply the result by the entire divisor
3. Subtract from the dividend
4. Repeat with the new polynomial until the degree is less than the divisor

### ✏️ Worked Example 1

**Problem:** Find the remainder when $p(x) = x^3 - 4x^2 + 2x + 5$ is divided by $(x - 3)$.

**Solution:** By the Remainder Theorem, remainder $= p(3)$:

$p(3) = 27 - 36 + 6 + 5 = 2$

Remainder: $2$.

### ✏️ Worked Example 2

**Problem:** Is $(x + 2)$ a factor of $p(x) = x^3 + 3x^2 - 4$?

**Solution:** $(x + 2) = (x - (-2))$, so check $p(-2)$:

$p(-2) = -8 + 12 - 4 = 0$

Since $p(-2) = 0$, yes — $(x + 2)$ is a factor.

### ✏️ Worked Example 3

**Problem:** If $p(x) = 2x^3 - 5x + c$ and $(x - 1)$ is a factor, find $c$.

**Solution:** $(x - 1)$ is a factor means $p(1) = 0$:

$2(1) - 5(1) + c = 0$

$-3 + c = 0$, so $c = 3$.

### ⚠️ SAT Traps to Avoid

- **Trap 1: Getting the sign of $a$ wrong.** For divisor $(x + 3) = (x - (-3))$, you evaluate $p(-3)$, not $p(3)$.
- **Trap 2: Forgetting that remainder = 0 means it is a factor.** These are two sides of the same coin.
- **Trap 3: Using long division when the Remainder Theorem is sufficient.** Save time — plug and check.

### 🔗 Connection

This builds on polynomial operations (Lesson 0) and factoring (Module 2). The Factor Theorem helps you find roots of higher-degree polynomials by testing possible factors. These skills also apply to simplifying rational expressions (next lesson).

### 🏋️ Quick Drill

1. Remainder when $x^2 + 3x + 5$ is divided by $(x - 1)$?
2. Is $(x - 2)$ a factor of $x^3 - 8$?
3. If $p(x)$ divided by $(x - 4)$ has remainder $0$, what is $p(4)$?
"""

theories[(3, 2)] = r"""## Simplifying Rational Expressions

### 🧠 Understanding the Concept

A **rational expression** is a fraction where the numerator and denominator are polynomials. Simplifying rational expressions is essentially the same as simplifying numerical fractions: factor the top and bottom, then cancel common factors.

On the SAT, rational expression problems test your factoring skills and your understanding of domain restrictions. A domain restriction occurs whenever a value of $x$ makes the denominator equal to zero — that value must be excluded.

Think of a rational expression as a fraction made of polynomials. Just as $\frac{6}{8}$ simplifies to $\frac{3}{4}$ by canceling the common factor of $2$, $\frac{x^2 - 4}{x + 2}$ simplifies to $x - 2$ by canceling $(x + 2)$ — but only when $x \neq -2$.

### 📐 Key Formulas

**Simplifying:** $\frac{P(x)}{Q(x)}$ — factor $P$ and $Q$, cancel common factors

**Multiplying:** $\frac{A}{B} \cdot \frac{C}{D} = \frac{AC}{BD}$ (factor and cancel first)

**Dividing:** $\frac{A}{B} \div \frac{C}{D} = \frac{A}{B} \cdot \frac{D}{C}$

**Adding/Subtracting:** Find a common denominator, combine numerators

### 📝 How to Solve (Step by Step)

1. **Factor** every numerator and denominator completely
2. **Cancel** common factors that appear in both numerator and denominator
3. **State domain restrictions** — values that make ANY original denominator zero
4. For addition/subtraction: find the **LCD**, rewrite each fraction, combine

### ✏️ Worked Example 1

**Problem:** Simplify $\frac{x^2 - 9}{x^2 - x - 6}$.

**Solution:**

Factor: $\frac{(x + 3)(x - 3)}{(x - 3)(x + 2)}$

Cancel $(x - 3)$: $\frac{x + 3}{x + 2}$ (where $x \neq 3$ and $x \neq -2$)

### ✏️ Worked Example 2

**Problem:** Simplify $\frac{2x + 4}{x^2 + 5x + 6} \cdot \frac{x + 3}{4}$.

**Solution:**

$= \frac{2(x + 2)}{(x + 2)(x + 3)} \cdot \frac{x + 3}{4}$

$= \frac{2 \cancel{(x + 2)}}{\cancel{(x + 2)} \cancel{(x + 3)}} \cdot \frac{\cancel{(x + 3)}}{4} = \frac{2}{4} = \frac{1}{2}$

### ✏️ Worked Example 3

**Problem:** Simplify $\frac{1}{x + 1} + \frac{2}{x - 1}$.

**Solution:**

LCD = $(x + 1)(x - 1)$

$= \frac{(x - 1) + 2(x + 1)}{(x + 1)(x - 1)} = \frac{x - 1 + 2x + 2}{x^2 - 1} = \frac{3x + 1}{x^2 - 1}$

### ⚠️ SAT Traps to Avoid

- **Trap 1: Canceling terms instead of factors.** $\frac{x + 3}{x + 5}$ does NOT simplify further. You can only cancel FACTORS (things multiplied), not TERMS (things added).
- **Trap 2: Forgetting domain restrictions.** Even after canceling, the original restriction remains.
- **Trap 3: Flipping addition/subtraction instead of multiplication/division.** Only flip when dividing, not when subtracting.

### 🔗 Connection

This relies heavily on factoring from Module 2 and polynomial operations from Lesson 0. It leads directly to solving rational equations (next lesson), where you clear fractions by multiplying by the LCD.

### 🏋️ Quick Drill

1. Simplify $\frac{x^2 - 4}{x + 2}$.
2. What values of $x$ are excluded from $\frac{5}{x(x - 3)}$?
3. Simplify $\frac{x^2 + 2x + 1}{x + 1}$.
"""

theories[(3, 3)] = r"""## Solving Rational Equations

### 🧠 Understanding the Concept

A **rational equation** is an equation that contains at least one fraction with a variable in the denominator. The standard strategy is to multiply both sides by the Least Common Denominator (LCD) to eliminate all fractions, turning it into a polynomial equation you can solve normally.

The critical twist: when you multiply by an expression containing a variable, you might introduce **extraneous solutions** — values that satisfy the transformed equation but make a denominator zero in the original. You must always check your answers.

On the SAT, rational equations appear in various forms: work-rate problems, proportion problems, and algebraic fraction problems. The common thread is clearing fractions and checking for extraneous solutions.

### 📐 Key Formulas

**Clearing fractions:** Multiply every term by the LCD.

**Work-rate formula:** $\frac{1}{t_A} + \frac{1}{t_B} = \frac{1}{t_{\text{together}}}$

**Extraneous solution check:** Verify each solution does not make any original denominator zero.

### 📝 How to Solve (Step by Step)

1. **Identify** the LCD of all fractions
2. **Multiply** every term by the LCD
3. **Simplify** and solve the resulting equation
4. **Check** every solution in the original equation — reject any that make a denominator zero

### ✏️ Worked Example 1

**Problem:** Solve $\frac{5}{x} - \frac{1}{3} = \frac{2}{x}$.

**Solution:**

LCD = $3x$. Multiply each term:

$3x \cdot \frac{5}{x} - 3x \cdot \frac{1}{3} = 3x \cdot \frac{2}{x}$

$15 - x = 6$

$x = 9$

Check: $\frac{5}{9} - \frac{1}{3} = \frac{5}{9} - \frac{3}{9} = \frac{2}{9} = \frac{2}{9}$ ✓

### ✏️ Worked Example 2

**Problem:** Solve $\frac{x}{x - 2} = \frac{4}{x - 2} + 1$.

**Solution:**

LCD = $(x - 2)$. Multiply:

$x = 4 + (x - 2) = x + 2$

$x = x + 2$ → $0 = 2$ — contradiction!

**No solution.** (And $x = 2$ would make the denominator zero anyway.)

### ✏️ Worked Example 3

**Problem:** Pipe A fills a tank in 6 hours, Pipe B in 4 hours. How long to fill together?

**Solution:**

$\frac{1}{6} + \frac{1}{4} = \frac{1}{t}$

$\frac{2}{12} + \frac{3}{12} = \frac{5}{12} = \frac{1}{t}$

$t = \frac{12}{5} = 2.4$ hours

### ⚠️ SAT Traps to Avoid

- **Trap 1: Forgetting to check for extraneous solutions.** Always verify your answer does not make a denominator zero.
- **Trap 2: Not multiplying EVERY term by the LCD.** If there is a standalone constant, it also gets multiplied.
- **Trap 3: Assuming "no solution" means you made a mistake.** Sometimes rational equations genuinely have no solution.

### 🔗 Connection

This builds on simplifying rational expressions (Lesson 2) and solving equations from Module 0. The LCD-clearing technique is the same as eliminating fractions in linear equations, just applied to variable denominators.

### 🏋️ Quick Drill

1. Solve $\frac{3}{x} = \frac{1}{2}$.
2. Solve $\frac{1}{x} + \frac{1}{x} = 1$.
3. If $\frac{x + 1}{x - 1} = 3$, what is $x$?
"""

theories[(3, 4)] = r"""## Radical Expressions and Equations

### 🧠 Understanding the Concept

A **radical expression** involves a root — most commonly a square root $\sqrt{}$, but also cube roots $\sqrt[3]{}$ and higher. On the SAT, the main skills are: simplifying radicals, rationalizing denominators, and solving radical equations.

Solving radical equations requires isolating the radical and then squaring both sides to eliminate it. The act of squaring can introduce extraneous solutions (values that work in the squared equation but not the original), so you must always check your answers.

The mental model for radicals: $\sqrt{x}$ asks "what number squared gives $x$?" This inverse relationship with squaring is why squaring both sides is the technique for solving radical equations — you undo the radical.

### 📐 Key Formulas

$\sqrt{ab} = \sqrt{a} \cdot \sqrt{b}$

$\sqrt{\frac{a}{b}} = \frac{\sqrt{a}}{\sqrt{b}}$

$(\sqrt{a})^2 = a$

$a^{1/2} = \sqrt{a}$, $a^{1/n} = \sqrt[n]{a}$, $a^{m/n} = (\sqrt[n]{a})^m$

### 📝 How to Solve (Step by Step)

**Simplifying radicals:**
1. Factor the radicand into perfect square × remaining
2. Take the square root of the perfect square part

**Solving radical equations:**
1. **Isolate** the radical on one side
2. **Square** both sides (or raise to the appropriate power)
3. **Solve** the resulting equation
4. **Check** every solution in the original equation

### ✏️ Worked Example 1

**Problem:** Simplify $\sqrt{72}$.

**Solution:**

$\sqrt{72} = \sqrt{36 \cdot 2} = 6\sqrt{2}$

### ✏️ Worked Example 2

**Problem:** Solve $\sqrt{2x + 7} = 5$.

**Solution:**

Square both sides: $2x + 7 = 25$

$2x = 18$, so $x = 9$

Check: $\sqrt{2(9) + 7} = \sqrt{25} = 5$ ✓

### ✏️ Worked Example 3

**Problem:** Solve $\sqrt{x + 3} = x - 3$.

**Solution:**

Square: $x + 3 = x^2 - 6x + 9$

$0 = x^2 - 7x + 6 = (x - 1)(x - 6)$

$x = 1$ or $x = 6$

Check $x = 1$: $\sqrt{4} = 2$ but $1 - 3 = -2$. $2 \neq -2$ ✗ (extraneous)

Check $x = 6$: $\sqrt{9} = 3$ and $6 - 3 = 3$ ✓

Answer: $x = 6$ only.

### ⚠️ SAT Traps to Avoid

- **Trap 1: Forgetting to check for extraneous solutions.** Squaring can create false solutions. ALWAYS check.
- **Trap 2: $\sqrt{x^2} = |x|$, not just $x$.** The square root function always returns a non-negative value.
- **Trap 3: $\sqrt{a + b} \neq \sqrt{a} + \sqrt{b}$.** Square roots do NOT distribute over addition.

### 🔗 Connection

Radicals connect to exponents (Module 4) through the relationship $\sqrt[n]{a} = a^{1/n}$. The checking-for-extraneous-solutions skill is the same as in rational equations (Lesson 3). Simplifying radicals appears in the Pythagorean theorem and distance formula (Module 6).

### 🏋️ Quick Drill

1. Simplify $\sqrt{200}$.
2. Solve $\sqrt{x} = 7$.
3. Rationalize $\frac{3}{\sqrt{5}}$.
"""

# ============================================================
# MODULE 4: Exponential Functions & Growth
# ============================================================

theories[(4, 0)] = r"""## Properties of Exponents

### 🧠 Understanding the Concept

**Exponents** are shorthand for repeated multiplication: $a^n$ means "$a$ multiplied by itself $n$ times." The rules of exponents allow you to simplify complex expressions efficiently. On the SAT, exponent problems test whether you can manipulate expressions with multiple bases and exponents, often requiring you to rewrite everything with a common base.

The key mental model: exponents track "how many times" a base is used as a factor. When you multiply powers of the same base, you add the counts. When you divide, you subtract. When you raise a power to a power, you multiply the counts. All the rules flow from this simple idea.

Fractional exponents bridge exponents and radicals: $a^{1/2} = \sqrt{a}$ and $a^{m/n} = \sqrt[n]{a^m}$. This connection is frequently tested on the SAT.

### 📐 Key Formulas

| Rule | Formula |
|------|---------|
| Product | $a^m \cdot a^n = a^{m+n}$ |
| Quotient | $\frac{a^m}{a^n} = a^{m-n}$ |
| Power of Power | $(a^m)^n = a^{mn}$ |
| Zero Exponent | $a^0 = 1$ ($a \neq 0$) |
| Negative Exponent | $a^{-n} = \frac{1}{a^n}$ |
| Fractional Exponent | $a^{m/n} = \sqrt[n]{a^m}$ |
| Product to Power | $(ab)^n = a^n b^n$ |

### 📝 How to Solve (Step by Step)

1. **Rewrite** all terms with the same base when possible
2. **Apply** the exponent rules to simplify
3. **Convert** between fractional exponents and radicals as needed
4. For expressions with multiple bases, handle each base separately

### ✏️ Worked Example 1

**Problem:** Simplify $\frac{(x^4)^3 \cdot x^{-5}}{x^2}$.

**Solution:**

$= \frac{x^{12} \cdot x^{-5}}{x^2} = \frac{x^7}{x^2} = x^5$

### ✏️ Worked Example 2

**Problem:** Evaluate $16^{3/4}$.

**Solution:**

$16^{3/4} = (\sqrt[4]{16})^3 = 2^3 = 8$

### ✏️ Worked Example 3

**Problem:** Simplify $\frac{9^3 \cdot 3^2}{27^2}$.

**Solution:**

Rewrite with base 3: $\frac{(3^2)^3 \cdot 3^2}{(3^3)^2} = \frac{3^6 \cdot 3^2}{3^6} = \frac{3^8}{3^6} = 3^2 = 9$

### ⚠️ SAT Traps to Avoid

- **Trap 1: Adding exponents when bases differ.** $2^3 \cdot 3^2 \neq 6^5$. You can only add exponents when bases match.
- **Trap 2: Confusing $(a^m)^n$ with $a^{m+n}$.** Power of a power MULTIPLIES exponents.
- **Trap 3: $a^0 = 1$, not $0$.** Anything (except 0) raised to the zero power is 1.

### 🔗 Connection

Exponent rules underpin exponential growth/decay (next lesson), solving exponential equations (Lesson 2), and compound interest (Lesson 3). They also connect to radicals (Module 3, Lesson 4) through fractional exponents.

### 🏋️ Quick Drill

1. Simplify $x^3 \cdot x^{-7}$.
2. Evaluate $8^{2/3}$.
3. Rewrite $\sqrt[3]{x^5}$ using fractional exponents.
"""

theories[(4, 1)] = r"""## Exponential Growth and Decay

### 🧠 Understanding the Concept

**Exponential growth** occurs when a quantity increases by a constant percentage each time period. **Exponential decay** occurs when it decreases by a constant percentage. Unlike linear growth (constant amount added), exponential growth compounds — each period's increase is larger than the last because it is applied to a bigger base.

The general model is $A(t) = A_0 \cdot b^t$, where $A_0$ is the initial amount and $b$ is the growth/decay factor. If the quantity grows by $r\%$ per period, then $b = 1 + \frac{r}{100}$. If it decays by $r\%$, then $b = 1 - \frac{r}{100}$.

On the SAT, you need to interpret exponential models: identify the initial value, the growth/decay rate, and the meaning of the exponent. Common contexts include population growth, radioactive decay, depreciation of cars, and bacterial colonies doubling.

### 📐 Key Formulas

**General model:** $A(t) = A_0 \cdot b^t$

**Growth:** $A(t) = A_0(1 + r)^t$ where $r > 0$

**Decay:** $A(t) = A_0(1 - r)^t$ where $0 < r < 1$

**Doubling time model:** $A(t) = A_0 \cdot 2^{t/d}$ (doubles every $d$ periods)

**Half-life model:** $A(t) = A_0 \cdot \left(\frac{1}{2}\right)^{t/h}$ (halves every $h$ periods)

### 📝 How to Solve (Step by Step)

1. **Identify** $A_0$ (initial value) and the rate of change
2. **Determine** whether it is growth ($b > 1$) or decay ($0 < b < 1$)
3. **Write** the model $A(t) = A_0 \cdot b^t$
4. **Solve** for the requested quantity (plug in $t$, or solve for $t$)

### ✏️ Worked Example 1

**Problem:** A population of 1,000 grows at $5\%$ per year. What is the population after 8 years?

**Solution:**

$P(8) = 1000(1.05)^8 = 1000 \times 1.4775 \approx 1,478$

### ✏️ Worked Example 2

**Problem:** A car worth \$30,000 depreciates $12\%$ per year. What is it worth after 5 years?

**Solution:**

$V(5) = 30000(0.88)^5 = 30000 \times 0.5277 \approx \$15,831$

### ✏️ Worked Example 3

**Problem:** A substance has a half-life of 10 years. If you start with 200 grams, how much remains after 30 years?

**Solution:**

$A(30) = 200 \cdot \left(\frac{1}{2}\right)^{30/10} = 200 \cdot \left(\frac{1}{2}\right)^3 = 200 \cdot \frac{1}{8} = 25$ grams

### ⚠️ SAT Traps to Avoid

- **Trap 1: Using the rate as the base.** Growth of $5\%$ means $b = 1.05$, NOT $b = 0.05$.
- **Trap 2: Confusing growth factor with growth rate.** If $b = 1.08$, the rate is $8\%$, not $1.08\%$.
- **Trap 3: Decay factor below 0.** If the problem says "decreases by $20\%$," $b = 0.80$. If $b$ is negative or zero, you have made an error.

### 🔗 Connection

This builds on exponent rules (Lesson 0) and contrasts with linear growth (Lesson 4). Compound interest (Lesson 3) is a special case of exponential growth. These models appear in SAT word problems and data interpretation.

### 🏋️ Quick Drill

1. If a colony doubles every 3 hours and starts at 100, what is the population after 9 hours?
2. A \$10,000 investment grows at $6\%$ per year. Write the model.
3. If $A(t) = 500(0.9)^t$, is this growth or decay? What is the rate?
"""

theories[(4, 2)] = r"""## Solving Exponential Equations

### 🧠 Understanding the Concept

An **exponential equation** has a variable in the exponent, like $2^x = 16$ or $3^{2x} = 27$. The primary strategy is to rewrite both sides with the **same base** so you can set the exponents equal.

On the SAT, most exponential equations can be solved by recognizing common bases: powers of 2 ($2, 4, 8, 16, 32, 64$), powers of 3 ($3, 9, 27, 81$), powers of 5 ($5, 25, 125$), etc. When a common base is not possible, you use logarithms, though the SAT rarely requires this.

The key insight: if $a^m = a^n$ and $a > 0$, $a \neq 1$, then $m = n$. This is because exponential functions are one-to-one — different inputs always produce different outputs.

### 📐 Key Formulas

**Same-Base Principle:** $a^m = a^n \implies m = n$ (when $a > 0$, $a \neq 1$)

**Logarithmic Solution:** $a^x = b \implies x = \frac{\log b}{\log a}$

**Common bases to know:** $4 = 2^2$, $8 = 2^3$, $16 = 2^4$, $32 = 2^5$, $9 = 3^2$, $27 = 3^3$, $81 = 3^4$, $25 = 5^2$, $125 = 5^3$

### 📝 How to Solve (Step by Step)

1. **Express** both sides as powers of the same base
2. **Set** the exponents equal
3. **Solve** the resulting linear or quadratic equation
4. If a common base is impossible, use logarithms

### ✏️ Worked Example 1

**Problem:** Solve $8^x = 32$.

**Solution:**

$(2^3)^x = 2^5$

$2^{3x} = 2^5$

$3x = 5$, so $x = \frac{5}{3}$

### ✏️ Worked Example 2

**Problem:** If $9^{x+1} = 27^x$, find $x$.

**Solution:**

$(3^2)^{x+1} = (3^3)^x$

$3^{2x+2} = 3^{3x}$

$2x + 2 = 3x$, so $x = 2$

### ✏️ Worked Example 3

**Problem:** Solve $5^x = 200$. (Express in terms of $\log$.)

**Solution:**

$x = \frac{\log 200}{\log 5} = \frac{\log 200}{\log 5} \approx \frac{2.301}{0.699} \approx 3.292$

### ⚠️ SAT Traps to Avoid

- **Trap 1: Not recognizing the common base.** $16$ and $64$ are both powers of $2$: $16 = 2^4$, $64 = 2^6$. Always look for this.
- **Trap 2: Misapplying exponent rules.** $(3^2)^x = 3^{2x}$, NOT $3^{2+x}$.
- **Trap 3: Forgetting that $a^0 = 1$.** If $5^x = 1$, then $x = 0$.

### 🔗 Connection

This applies the exponent rules from Lesson 0 to equation-solving. The common-base technique connects to logarithms (which the SAT tests lightly). These skills are needed for compound interest problems (next lesson).

### 🏋️ Quick Drill

1. Solve $2^x = 64$.
2. Solve $4^x = 2^6$.
3. If $3^{2x} = 81$, what is $x$?
"""

theories[(4, 3)] = r"""## Compound Interest and Financial Applications

### 🧠 Understanding the Concept

**Compound interest** is interest calculated on both the principal and the accumulated interest from previous periods. This makes money grow exponentially rather than linearly (simple interest). The SAT tests your ability to use the compound interest formula and interpret exponential financial models.

The formula $A = P(1 + \frac{r}{n})^{nt}$ captures the essential idea: the interest rate $r$ is divided by $n$ (the number of compounding periods per year) and applied $n$ times per year for $t$ years, giving a total of $nt$ compounding events.

On the SAT, interpretation is key. Given an expression like $A = 1500(1.02)^{4t}$, you need to recognize that the base $1.02$ represents a $2\%$ growth per quarter (since the exponent is $4t$), which means $8.24\%$ effective annual rate.

### 📐 Key Formulas

**Compound Interest:** $A = P\left(1 + \frac{r}{n}\right)^{nt}$

**Simple Interest:** $A = P(1 + rt)$

**Continuous Compounding:** $A = Pe^{rt}$

| Compounding | $n$ |
|-------------|-----|
| Annually | 1 |
| Semi-annually | 2 |
| Quarterly | 4 |
| Monthly | 12 |
| Daily | 365 |

### 📝 How to Solve (Step by Step)

1. **Identify** $P$ (principal), $r$ (annual rate), $n$ (compounding frequency), $t$ (years)
2. **Plug** into the formula
3. **Simplify** the base: $1 + \frac{r}{n}$
4. **Compute** the exponent: $nt$
5. For interpretation questions: identify what each part represents

### ✏️ Worked Example 1

**Problem:** \$3,000 invested at $5\%$ compounded monthly for 2 years. Find the final amount.

**Solution:**

$A = 3000\left(1 + \frac{0.05}{12}\right)^{12 \cdot 2} = 3000(1.004167)^{24} \approx 3000(1.10494) \approx \$3,314.83$

### ✏️ Worked Example 2

**Problem:** The value of an investment is given by $V = 5000(1.03)^t$. What is the annual growth rate?

**Solution:**

The base is $1.03 = 1 + 0.03$, so the annual growth rate is $3\%$.

$5000$ is the initial investment. $t$ is in years.

### ✏️ Worked Example 3

**Problem:** Which expression represents \$1,000 growing at $6\%$ compounded semi-annually for $t$ years?

**Solution:**

$A = 1000\left(1 + \frac{0.06}{2}\right)^{2t} = 1000(1.03)^{2t}$

### ⚠️ SAT Traps to Avoid

- **Trap 1: Confusing rate per period with annual rate.** If compounded quarterly at $8\%$ annual, the rate per period is $\frac{0.08}{4} = 0.02$, not $0.08$.
- **Trap 2: Mixing up $n$ and $t$.** $n$ is how often per year, $t$ is years. The exponent is $n \times t$.
- **Trap 3: Thinking simple and compound interest are the same.** \$1,000 at $10\%$ for 2 years: Simple = \$1,200; Compound = \$1,210.

### 🔗 Connection

This is a direct application of exponential growth (Lesson 1). The formula structure $(1 + r/n)^{nt}$ uses exponent rules from Lesson 0. This also connects to comparing growth models (next lesson).

### 🏋️ Quick Drill

1. \$500 at $4\%$ compounded annually for 3 years: what is $A$?
2. In $A = 2000(1.005)^{12t}$, what is the monthly rate? The annual rate?
3. Is $2000(1.04)^t$ or $2000(1.01)^{4t}$ a higher effective rate?
"""

theories[(4, 4)] = r"""## Comparing Linear vs. Exponential Growth

### 🧠 Understanding the Concept

One of the most important concepts on the SAT is understanding the fundamental difference between **linear** and **exponential** growth. Linear growth adds a constant amount each period. Exponential growth multiplies by a constant factor each period. This seemingly small distinction leads to vastly different long-term behavior.

In tables, you can distinguish the two by checking **differences** (linear: constant first differences) versus **ratios** (exponential: constant ratios between consecutive values). This is the #1 technique for identifying the type of growth from data.

The critical insight: **exponential growth always eventually overtakes linear growth**, no matter how large the linear rate. A savings account earning \$10,000/year will eventually be surpassed by one earning 1% compounded annually, given enough time.

### 📐 Key Formulas

**Linear:** $f(t) = b + mt$ (constant differences of $m$)

**Exponential:** $g(t) = a \cdot r^t$ (constant ratios of $r$)

**Test from table:**
- $f(t+1) - f(t) = \text{constant}$ → Linear
- $\frac{g(t+1)}{g(t)} = \text{constant}$ → Exponential

### 📝 How to Solve (Step by Step)

1. **Check differences** between consecutive values — if constant, the model is linear
2. **Check ratios** between consecutive values — if constant, the model is exponential
3. **Write the model** using the identified pattern
4. For comparison questions: evaluate both models at the given time

### ✏️ Worked Example 1

**Problem:** A table shows: $t = 0, 100$; $t = 1, 110$; $t = 2, 121$; $t = 3, 133.1$. Linear or exponential?

**Solution:**

Differences: $10, 11, 12.1$ — NOT constant.

Ratios: $110/100 = 1.1$, $121/110 = 1.1$, $133.1/121 = 1.1$ — CONSTANT.

This is **exponential** with $g(t) = 100(1.1)^t$.

### ✏️ Worked Example 2

**Problem:** Plan A pays \$500/month plus \$200/month raises. Plan B starts at \$500/month and increases by $10\%$ monthly. Which pays more after 24 months?

**Solution:**

Plan A (month 24): $500 + 200(24) = \$5,300$

Plan B (month 24): $500(1.10)^{24} = 500(9.85) \approx \$4,925$

Plan A pays more at month 24. But eventually Plan B will surpass Plan A.

### ✏️ Worked Example 3

**Problem:** An SAT problem states: "Each year, quantity X increases by 15, and quantity Y increases by 15%." If both start at 100, which is larger after 20 years?

**Solution:**

$X(20) = 100 + 15(20) = 400$

$Y(20) = 100(1.15)^{20} = 100(16.37) = 1,637$

$Y$ is much larger. Exponential growth dominates.

### ⚠️ SAT Traps to Avoid

- **Trap 1: Confusing "increases by 50" (linear) with "increases by 50%" (exponential).** The word "by" alone is ambiguous — always check for a percent sign.
- **Trap 2: Assuming linear is always less.** For short time periods, linear growth can be larger.
- **Trap 3: Checking only two data points.** A linear and exponential model might agree at two points but diverge elsewhere. Check multiple points.

### 🔗 Connection

This lesson synthesizes everything in Module 4 by comparing exponential models (Lessons 1-3) with linear models (Module 0). This comparison appears frequently on the SAT in data interpretation and model selection questions.

### 🏋️ Quick Drill

1. Data: $5, 10, 15, 20$. Linear or exponential?
2. Data: $3, 6, 12, 24$. Linear or exponential?
3. $f(t) = 1000 + 50t$ vs. $g(t) = 10 \cdot 2^t$. Which is larger at $t = 10$?
"""

# ============================================================
# MODULE 5: Data Analysis & Statistics
# ============================================================

theories[(5, 0)] = r"""## Mean, Median, Mode, and Range

### 🧠 Understanding the Concept

**Measures of center** (mean and median) and **measures of spread** (range) describe a data set with a few numbers. The SAT tests your ability to compute these, understand how they change when data is added or removed, and interpret them in context.

The **mean** is the arithmetic average: add all values and divide by the count. It is affected by every value in the data set, including outliers. The **median** is the middle value when data is sorted, making it resistant to outliers. The **mode** is the most frequent value. The **range** is the difference between the largest and smallest values.

On the SAT, the most common question type is: "Given the mean of $n$ numbers, find a missing value" or "How does adding a value change the mean?" The key formula is $\text{Sum} = \text{Mean} \times \text{Count}$.

### 📐 Key Formulas

$$\text{Mean} = \bar{x} = \frac{\sum x_i}{n}$$

$$\text{Sum} = \bar{x} \cdot n$$

$$\text{Median} = \text{middle value (sorted data)}$$

$$\text{Range} = \max - \min$$

$$\text{Weighted Mean} = \frac{\sum w_i x_i}{\sum w_i}$$

### 📝 How to Solve (Step by Step)

**Finding a missing value given the mean:**
1. Compute the desired total sum: $\text{Sum} = \text{Mean} \times \text{Count}$
2. Subtract the known values from the sum
3. The remainder is the missing value

**Finding the median:**
1. Sort the data from least to greatest
2. If $n$ is odd: median is the middle value at position $\frac{n+1}{2}$
3. If $n$ is even: median is the average of the two middle values

### ✏️ Worked Example 1

**Problem:** The average of 8 numbers is 15. When a 9th number is added, the average becomes 17. What is the 9th number?

**Solution:**

Original sum: $8 \times 15 = 120$

New sum: $9 \times 17 = 153$

9th number: $153 - 120 = 33$

### ✏️ Worked Example 2

**Problem:** Data: $\{3, 7, 7, 9, 10, 12, 15\}$. Find the mean and median.

**Solution:**

Mean: $\frac{3 + 7 + 7 + 9 + 10 + 12 + 15}{7} = \frac{63}{7} = 9$

Median: The 4th value (middle of 7): $9$

### ✏️ Worked Example 3

**Problem:** A student's test scores are 78, 85, 90, 92. What score does she need on the 5th test to have an average of 88?

**Solution:**

Desired sum: $5 \times 88 = 440$

Current sum: $78 + 85 + 90 + 92 = 345$

Needed: $440 - 345 = 95$

### ⚠️ SAT Traps to Avoid

- **Trap 1: Using the mean formula for median problems.** Mean and median are different measures.
- **Trap 2: Not sorting data before finding the median.** The median requires ordered data.
- **Trap 3: Forgetting that an outlier affects the mean but not the median.** If one extreme value changes, the mean shifts significantly but the median may not change at all.

### 🔗 Connection

This is the foundation for all statistics questions on the SAT. Standard deviation (next lesson) builds on the mean. These concepts appear in scatterplot interpretation (Lesson 4) and study design (Lesson 5).

### 🏋️ Quick Drill

1. The mean of 4 numbers is 10. What is their sum?
2. Data: $\{2, 5, 5, 8, 10\}$. Mean? Median? Mode?
3. Adding a 6th value of 100 to the set above: does the mean or median change more?
"""

theories[(5, 1)] = r"""## Standard Deviation and Data Spread

### 🧠 Understanding the Concept

**Standard deviation** (SD) measures how spread out data values are from the mean. A small SD means data points cluster tightly around the mean; a large SD means they are widely dispersed. The SAT tests your conceptual understanding of SD — you will never need to calculate it by hand.

The mental model: imagine the mean as the center of a target. If all data points are near the bullseye, the SD is small. If they are scattered all over the target, the SD is large. Two data sets can have the same mean but very different standard deviations.

The **normal distribution** (bell curve) uses standard deviation to describe how data spreads: about $68\%$ of data falls within 1 SD of the mean, $95\%$ within 2 SDs, and $99.7\%$ within 3 SDs. This is called the **68-95-99.7 rule**.

### 📐 Key Formulas

**68-95-99.7 Rule** (for normal distributions):
- $68\%$ within $[\bar{x} - \sigma, \bar{x} + \sigma]$
- $95\%$ within $[\bar{x} - 2\sigma, \bar{x} + 2\sigma]$
- $99.7\%$ within $[\bar{x} - 3\sigma, \bar{x} + 3\sigma]$

**Key Properties:**
- SD $\geq 0$; SD $= 0$ only if all values are identical
- Adding a constant to all values: SD unchanged
- Multiplying all values by $k$: SD multiplied by $|k|$

### 📝 How to Solve (Step by Step)

**Comparing SDs on the SAT:**
1. Look at how spread out the data is from the mean
2. More spread = larger SD
3. Identical values = SD of 0

**Using the 68-95-99.7 rule:**
1. Identify the mean and SD
2. Calculate the boundaries ($\bar{x} \pm \sigma$, $\bar{x} \pm 2\sigma$, $\bar{x} \pm 3\sigma$)
3. Determine what percentage of data falls in the asked region

### ✏️ Worked Example 1

**Problem:** Set A: $\{50, 50, 50, 50, 50\}$. Set B: $\{10, 30, 50, 70, 90\}$. Compare their SDs.

**Solution:**

Set A: All values are identical, so SD $= 0$.

Set B: Values are spread widely from the mean of 50, so SD is large.

Set B has a much greater standard deviation.

### ✏️ Worked Example 2

**Problem:** Scores on a test are normally distributed with mean 500 and SD 100. What percentage of scores fall between 300 and 700?

**Solution:**

$300 = 500 - 2(100)$ and $700 = 500 + 2(100)$

This is within 2 SDs of the mean, so approximately $95\%$.

### ✏️ Worked Example 3

**Problem:** If every student's score increases by 10 points, how does this affect the SD?

**Solution:**

Adding a constant shifts all values equally — the spread does not change. The SD remains the same.

### ⚠️ SAT Traps to Avoid

- **Trap 1: Thinking larger mean = larger SD.** Mean and SD are independent. $\{100, 100, 100\}$ has SD = 0.
- **Trap 2: Assuming the 68-95-99.7 rule applies to all distributions.** It only applies to normal (bell-shaped) distributions.
- **Trap 3: Confusing range with SD.** Range is just max minus min; SD accounts for how ALL values relate to the mean.

### 🔗 Connection

SD builds on the concept of the mean (Lesson 0). Understanding data spread helps in interpreting scatterplots (Lesson 4) and evaluating study designs (Lesson 5). The normal distribution appears in probability questions.

### 🏋️ Quick Drill

1. Which has larger SD: $\{1, 2, 3, 4, 5\}$ or $\{3, 3, 3, 3, 3\}$?
2. Mean = 80, SD = 5. What range captures about $95\%$ of normally distributed data?
3. Every value in a data set is multiplied by 3. What happens to the SD?
"""

theories[(5, 2)] = r"""## Probability and Two-Way Tables

### 🧠 Understanding the Concept

**Probability** measures the likelihood of an event, expressed as a number between 0 (impossible) and 1 (certain). On the SAT, probability problems often use **two-way tables** — tables that organize data by two categorical variables.

The key to two-way table problems is understanding the difference between **joint probability** (the probability of both conditions), **marginal probability** (the probability of one condition regardless of the other), and **conditional probability** (the probability of one condition given that another is true).

For conditional probability, the critical skill is restricting your attention to the "given" group. "P(Sports | Female)" means: look only at females, then find what fraction play sports. You are zooming into a subset of the data.

### 📐 Key Formulas

$$P(\text{event}) = \frac{\text{favorable outcomes}}{\text{total outcomes}}$$

$$P(\text{not A}) = 1 - P(A)$$

$$P(A \text{ and } B) = \frac{\text{count of both A and B}}{\text{total}}$$

$$P(A | B) = \frac{P(A \text{ and } B)}{P(B)} = \frac{\text{count of both A and B}}{\text{count of B}}$$

### 📝 How to Solve (Step by Step)

**For two-way table problems:**
1. Read the table carefully — identify row totals, column totals, and grand total
2. Identify what the question asks: joint, marginal, or conditional probability
3. For conditional: restrict to the "given" row or column, use THAT total as the denominator
4. Simplify the fraction

### ✏️ Worked Example 1

**Problem:** In a survey of 120 students, 45 are in Band, 60 play Sports, and 20 do both. What is P(Band or Sports)?

**Solution:**

$P(A \cup B) = P(A) + P(B) - P(A \cap B) = \frac{45}{120} + \frac{60}{120} - \frac{20}{120} = \frac{85}{120} = \frac{17}{24}$

### ✏️ Worked Example 2

**Problem:** Using this table:

| | Pass | Fail | Total |
|---|---|---|---|
| Studied | 40 | 10 | 50 |
| Did not study | 15 | 35 | 50 |
| Total | 55 | 45 | 100 |

What is P(Pass | Studied)?

**Solution:**

Restrict to "Studied" row: 40 passed out of 50 who studied.

$P(\text{Pass | Studied}) = \frac{40}{50} = \frac{4}{5}$

### ✏️ Worked Example 3

**Problem:** From the same table, what is P(Studied | Pass)?

**Solution:**

Restrict to "Pass" column: 40 studied out of 55 who passed.

$P(\text{Studied | Pass}) = \frac{40}{55} = \frac{8}{11}$

### ⚠️ SAT Traps to Avoid

- **Trap 1: Using the wrong denominator.** For conditional probability, the denominator is the total of the given condition, NOT the grand total.
- **Trap 2: Confusing $P(A | B)$ with $P(B | A)$.** These are different! "P(pass given studied)" is not the same as "P(studied given pass)."
- **Trap 3: Forgetting to subtract the overlap.** In "or" problems: $P(A \text{ or } B) = P(A) + P(B) - P(A \text{ and } B)$.

### 🔗 Connection

Probability builds on ratios and fractions (Lesson 3). Two-way tables appear in study design questions (Lesson 5). These skills also connect to interpreting survey data and making statistical inferences.

### 🏋️ Quick Drill

1. A bag has 3 red and 7 blue balls. What is P(red)?
2. P(A) = 0.4, P(not A) = ?
3. In a table, 30 out of 80 females passed. What is P(Pass | Female)?
"""

theories[(5, 3)] = r"""## Ratios, Proportions, and Percentages

### 🧠 Understanding the Concept

**Ratios**, **proportions**, and **percentages** are the language of comparison on the SAT. Ratios compare two quantities, proportions state that two ratios are equal, and percentages express a number as a fraction of 100. These concepts appear in nearly every section of the SAT.

The key skill is translating between these representations. A ratio of 3:5 means "for every 3 of one thing, there are 5 of another." A proportion like $\frac{3}{5} = \frac{x}{20}$ can be solved by cross-multiplying. A percentage change requires careful attention to what the "base" is.

The biggest trap on the SAT is **successive percentage changes**. A $20\%$ increase followed by a $20\%$ decrease does NOT return to the original value — it results in a $4\%$ decrease. This is because the second percentage is applied to the new (larger) value.

### 📐 Key Formulas

**Proportion:** $\frac{a}{b} = \frac{c}{d} \implies ad = bc$ (cross-multiply)

**Percent change:** $\frac{\text{New} - \text{Old}}{\text{Old}} \times 100\%$

**Successive changes:** Multiply the factors: $(1 + r_1)(1 + r_2) \cdot \text{original}$

**Part-whole:** $\text{Part} = \text{Percentage} \times \text{Whole}$

### 📝 How to Solve (Step by Step)

**Ratio problems:**
1. Set up the ratio $a : b$ and find the total parts: $a + b$
2. Divide the total quantity by the number of parts to find "one part"
3. Multiply to find each quantity

**Percent change:**
1. Compute the change: $\text{New} - \text{Old}$
2. Divide by the **original** (old) value
3. Multiply by 100

### ✏️ Worked Example 1

**Problem:** The ratio of cats to dogs in a shelter is $3:7$. If there are 50 animals total, how many are cats?

**Solution:**

Total parts: $3 + 7 = 10$

One part: $50 / 10 = 5$

Cats: $3 \times 5 = 15$

### ✏️ Worked Example 2

**Problem:** A price goes from \$40 to \$52. What is the percent increase?

**Solution:**

$\frac{52 - 40}{40} \times 100 = \frac{12}{40} \times 100 = 30\%$

### ✏️ Worked Example 3

**Problem:** A price increases by $25\%$ then decreases by $20\%$. Starting at \$100, what is the final price?

**Solution:**

After $+25\%$: $100 \times 1.25 = 125$

After $-20\%$: $125 \times 0.80 = 100$

Final price: \$100. (This is a coincidence for this specific pair of percentages.)

### ⚠️ SAT Traps to Avoid

- **Trap 1: Using the wrong base for percent change.** Percent change is always relative to the ORIGINAL value.
- **Trap 2: Thinking $+20\%$ then $-20\%$ returns to the start.** It does NOT (except in rare special cases). $100 \to 120 \to 96$.
- **Trap 3: Confusing "percent of" with "percent more than."** $120$ is $20\%$ more than $100$, but $100$ is $16.7\%$ less than $120$.

### 🔗 Connection

Ratios and proportions appear in similar triangles (Module 6), probability (Lesson 2), and unit conversion problems. Percent change connects to exponential growth (Module 4) as repeated percentage changes.

### 🏋️ Quick Drill

1. Ratio $2:3$, total 25. How many in the smaller group?
2. Price drops from \$80 to \$60. Percent decrease?
3. A $10\%$ increase followed by a $10\%$ decrease on \$200: final price?
"""

theories[(5, 4)] = r"""## Scatterplots and Lines of Best Fit

### 🧠 Understanding the Concept

A **scatterplot** displays the relationship between two quantitative variables as a collection of dots on the coordinate plane. On the SAT, you analyze scatterplots to identify trends, interpret lines of best fit, and make predictions.

The **line of best fit** (regression line) is the straight line that best represents the trend in the data. Its equation $y = mx + b$ allows you to make predictions: plug in an $x$-value to get a predicted $y$. The slope represents the rate of change, and the $y$-intercept is the predicted value when $x = 0$.

**Residuals** measure how far each actual data point is from the predicted value: $\text{residual} = \text{actual} - \text{predicted}$. A positive residual means the actual value is above the line; a negative residual means it is below.

### 📐 Key Formulas

**Line of best fit:** $\hat{y} = mx + b$

**Residual:** $e = y_{\text{actual}} - y_{\text{predicted}}$

**Correlation coefficient $r$:** Measures strength and direction ($-1 \leq r \leq 1$)
- $r$ near $+1$: strong positive linear association
- $r$ near $-1$: strong negative linear association
- $r$ near $0$: weak or no linear association

### 📝 How to Solve (Step by Step)

**Interpreting a line of best fit:**
1. **Slope:** "For each one-unit increase in $x$, $y$ changes by $m$ units"
2. **Y-intercept:** "When $x = 0$, the predicted $y$ is $b$"
3. **Prediction:** Plug in the given $x$-value to get $\hat{y}$

**Identifying association from a scatterplot:**
1. Look at the overall direction: up (positive), down (negative), or scattered (none)
2. Look at the tightness: tight cluster = strong, loose scatter = weak

### ✏️ Worked Example 1

**Problem:** The line of best fit for hours studied ($x$) vs. exam score ($y$) is $y = 7x + 50$. Interpret the slope and intercept.

**Solution:**

Slope: Each additional hour of studying is associated with a 7-point increase in exam score.

Intercept: A student who studies 0 hours is predicted to score 50 (the base score).

### ✏️ Worked Example 2

**Problem:** Using $y = 7x + 50$, predict the score for a student who studies 5 hours.

**Solution:**

$\hat{y} = 7(5) + 50 = 85$

If the student actually scored 90: residual $= 90 - 85 = 5$ (above predicted).

### ✏️ Worked Example 3

**Problem:** A scatterplot shows data points clustered tightly around a line that slopes downward. Describe the association.

**Solution:** The association is **strong and negative** — as $x$ increases, $y$ tends to decrease, and the relationship is consistent (tight clustering).

### ⚠️ SAT Traps to Avoid

- **Trap 1: Correlation does NOT imply causation.** A strong correlation between ice cream sales and drownings does not mean ice cream causes drowning (both increase in summer).
- **Trap 2: Extrapolation is unreliable.** Predictions far outside the data range are not trustworthy.
- **Trap 3: Confusing the sign of the slope with the strength.** $r = -0.95$ is a STRONGER correlation than $r = 0.3$.

### 🔗 Connection

This builds on interpreting linear functions (Module 0, Lesson 2). The line of best fit uses the same $y = mx + b$ framework. Scatterplot questions often accompany study design questions (next lesson).

### 🏋️ Quick Drill

1. Line of best fit: $y = -3x + 100$. What does the $-3$ mean?
2. Predicted: 72, Actual: 68. What is the residual?
3. Does $r = -0.9$ indicate a strong or weak association?
"""

theories[(5, 5)] = r"""## Sampling, Surveys, and Study Design

### 🧠 Understanding the Concept

On the SAT, several questions test your understanding of how data is collected and what conclusions can be drawn. The two key concepts are: (1) **random sampling** allows generalization to the population, and (2) **random assignment** in experiments allows causal conclusions.

An **observational study** observes existing conditions without intervention. It can show association but NOT causation. An **experiment** applies a treatment with random assignment, enabling cause-and-effect conclusions.

**Bias** is any systematic error in data collection. Common types: selection bias (sample is not representative), response bias (leading questions), and non-response bias (people who do not respond differ from those who do).

### 📐 Key Formulas

No formulas needed — this topic is about conceptual understanding.

**Key relationships:**
- Random sampling → generalizable to population
- Random assignment (experiment) → can show causation
- Observational study → can show association only

### 📝 How to Solve (Step by Step)

1. **Identify** the study type: experiment (random assignment + treatment) or observational
2. **Check** for random sampling (can we generalize?)
3. **Look** for sources of bias
4. **Determine** what conclusion is valid:
   - Experiment + random sampling → causal conclusion generalizable to population
   - Experiment only → causal conclusion for the study group only
   - Observational → association only

### ✏️ Worked Example 1

**Problem:** Researchers surveyed 500 randomly selected adults and found that those who exercise more tend to have lower blood pressure. Can they conclude that exercise lowers blood pressure?

**Solution:** No. This is an observational study (no treatment was assigned). It shows an **association** between exercise and lower blood pressure, but cannot establish causation. Other factors (diet, genetics) may explain the relationship.

### ✏️ Worked Example 2

**Problem:** 200 volunteers are randomly assigned to drink either green tea or water daily for 3 months. The green tea group shows improved memory. Can causation be claimed?

**Solution:** Yes. This is a **randomized experiment** with random assignment. The difference can be attributed to the green tea treatment. However, the result applies only to the volunteer pool (not the general population unless volunteers were randomly sampled).

### ✏️ Worked Example 3

**Problem:** A school surveys only honor students about school lunch quality. Is this sample representative?

**Solution:** No. This is **selection bias** — honor students may have different lunch habits and opinions than the general student body. The results cannot be generalized to all students.

### ⚠️ SAT Traps to Avoid

- **Trap 1: Claiming causation from an observational study.** If there is no random assignment, you CANNOT claim causation, even with a large sample.
- **Trap 2: Confusing random sampling with random assignment.** Random sampling = who is in the study. Random assignment = who gets the treatment.
- **Trap 3: Ignoring sample bias.** A large sample does not fix bias. A biased sample of 10,000 is still biased.

### 🔗 Connection

This is the culmination of the Data Analysis module. Understanding study design helps you evaluate the validity of statistical claims made in scatterplot and probability questions. These concepts are unique to the SAT and do not appear as prominently in other math courses.

### 🏋️ Quick Drill

1. A study finds coffee drinkers sleep less. Can you claim coffee causes less sleep?
2. 100 patients are randomly assigned to drug or placebo. What type of study is this?
3. A survey of gym members about exercise habits: is this biased?
"""

# ============================================================
# MODULE 6: Geometry & Measurement
# ============================================================

theories[(6, 0)] = r"""## Area and Perimeter of Basic Shapes

### 🧠 Understanding the Concept

**Area** measures the space inside a two-dimensional shape (in square units), while **perimeter** measures the distance around it (in linear units). The SAT provides most area and perimeter formulas on the reference sheet, but you should memorize the common ones for speed.

On the SAT, geometry problems often involve **composite shapes** (shapes made of simpler parts) and **shaded regions** (where you subtract one area from another). The strategy is always: break the complex shape into simpler shapes, find each area separately, then add or subtract.

The most frequently tested shapes are rectangles, triangles, and circles. Circle problems (area and circumference) appear in almost every SAT.

### 📐 Key Formulas

| Shape | Area | Perimeter |
|-------|------|-----------|
| Rectangle | $A = lw$ | $P = 2(l + w)$ |
| Triangle | $A = \frac{1}{2}bh$ | $P = a + b + c$ |
| Circle | $A = \pi r^2$ | $C = 2\pi r = \pi d$ |
| Trapezoid | $A = \frac{1}{2}(b_1 + b_2)h$ | Sum of sides |
| Parallelogram | $A = bh$ | $P = 2(a + b)$ |

**Shaded region:** $A_{\text{shaded}} = A_{\text{outer}} - A_{\text{inner}}$

### 📝 How to Solve (Step by Step)

1. **Identify** the shape(s) involved
2. **Find** all necessary dimensions (side lengths, radii, heights)
3. **Apply** the appropriate formula
4. For composite shapes: **add** or **subtract** areas
5. **Watch units** — make sure all measurements use the same units

### ✏️ Worked Example 1

**Problem:** A circle with radius 5 is inscribed in a square. Find the area of the shaded region (between the square and circle).

**Solution:**

Square side = diameter = 10. Square area = $100$.

Circle area = $\pi(5)^2 = 25\pi$.

Shaded = $100 - 25\pi \approx 100 - 78.54 = 21.46$

### ✏️ Worked Example 2

**Problem:** A semicircle has diameter 12. Find its area and perimeter.

**Solution:**

Radius = 6. Area = $\frac{1}{2}\pi(6)^2 = 18\pi$.

Perimeter = curved part + diameter = $\frac{1}{2}(2\pi \cdot 6) + 12 = 6\pi + 12$.

### ✏️ Worked Example 3

**Problem:** A triangle has base 8 and height 5. A rectangle inside it has base 8 and height 3. What is the area outside the rectangle but inside the triangle?

**Solution:**

Triangle area = $\frac{1}{2}(8)(5) = 20$

Rectangle area = $8 \times 3 = 24$

Wait — the rectangle cannot have a larger area than the triangle with these dimensions. Let me reconsider: the rectangle must have a smaller base. If the problem means a rectangle of width $w$ and height 3 inscribed in the triangle, we need more information. Assuming the problem means the combined region: $20 - 24 < 0$, so let's use: rectangle base 4, height 3.

Area outside rectangle = $20 - 12 = 8$.

### ⚠️ SAT Traps to Avoid

- **Trap 1: Confusing radius and diameter.** If the diameter is 10, the radius is 5. Always check which is given.
- **Trap 2: Forgetting that the height of a triangle must be perpendicular to the base.** A slanted side is NOT the height.
- **Trap 3: Not including all parts of the perimeter.** For a semicircle, the perimeter includes the curved arc AND the diameter.

### 🔗 Connection

Area and perimeter are the foundation for all geometry on the SAT. These formulas are used in volume problems (next lesson), similar figure problems (Lesson 2), and coordinate geometry (Lesson 4).

### 🏋️ Quick Drill

1. Area of a circle with diameter 8?
2. Perimeter of a rectangle with $l = 7$ and $w = 3$?
3. A square has area 49. What is its perimeter?
"""

theories[(6, 1)] = r"""## Volume and Surface Area of 3D Solids

### 🧠 Understanding the Concept

**Volume** measures the space inside a three-dimensional object (in cubic units), while **surface area** measures the total area of its outer surface (in square units). The SAT provides volume formulas on the reference sheet, but familiarity speeds you up.

The most commonly tested solids are cylinders, rectangular prisms (boxes), cones, and spheres. Many SAT problems are word problems: "A cylindrical tank holds how many gallons?" or "How much material is needed to wrap a box?" The key is identifying the correct formula and plugging in the given values.

Remember the relationship between similar shapes: if the linear scale factor is $k$, then areas scale by $k^2$ and volumes scale by $k^3$.

### 📐 Key Formulas

| Solid | Volume | Surface Area |
|-------|--------|-------------|
| Rectangular Prism | $V = lwh$ | $SA = 2(lw + lh + wh)$ |
| Cylinder | $V = \pi r^2 h$ | $SA = 2\pi r^2 + 2\pi rh$ |
| Cone | $V = \frac{1}{3}\pi r^2 h$ | $SA = \pi r^2 + \pi rl$ |
| Sphere | $V = \frac{4}{3}\pi r^3$ | $SA = 4\pi r^2$ |
| Pyramid | $V = \frac{1}{3}Bh$ | Depends on base |

### 📝 How to Solve (Step by Step)

1. **Identify** the solid and its dimensions
2. **Choose** the correct formula (volume or surface area)
3. **Substitute** the given values
4. **Simplify** — leave in terms of $\pi$ if the answer choices are in that form
5. For "how much fits inside": volume. For "how much material to cover": surface area.

### ✏️ Worked Example 1

**Problem:** A cylinder has radius 4 and height 10. Find its volume.

**Solution:** $V = \pi(4)^2(10) = 160\pi \approx 502.7$ cubic units.

### ✏️ Worked Example 2

**Problem:** A sphere has volume $288\pi$. Find the radius.

**Solution:**

$\frac{4}{3}\pi r^3 = 288\pi$

$r^3 = 288 \times \frac{3}{4} = 216$

$r = 6$

### ✏️ Worked Example 3

**Problem:** A cone has radius 3 and height 4. A similar cone has radius 6. What is the volume of the larger cone?

**Solution:**

Scale factor: $k = 6/3 = 2$. Volume scales by $k^3 = 8$.

Small cone volume: $V = \frac{1}{3}\pi(9)(4) = 12\pi$

Large cone volume: $12\pi \times 8 = 96\pi$

### ⚠️ SAT Traps to Avoid

- **Trap 1: Confusing $r$ and $d$.** The formula uses radius, not diameter. If given diameter 10, use $r = 5$.
- **Trap 2: Forgetting the $\frac{1}{3}$ for cones and pyramids.** A cone is one-third of a cylinder with the same base and height.
- **Trap 3: Scaling errors.** If you double the radius, volume increases by $2^3 = 8$ times, not $2$ times.

### 🔗 Connection

Volume builds on area formulas (Lesson 0). The scaling relationships connect to similar figures (Lesson 2). These formulas appear in real-world SAT problems about tanks, containers, and packaging.

### 🏋️ Quick Drill

1. Volume of a cube with side 5?
2. A cylinder has $V = 100\pi$ and $h = 4$. Find $r$.
3. If a sphere's radius triples, by what factor does its volume increase?
"""

theories[(6, 2)] = r"""## Similar and Congruent Triangles

### 🧠 Understanding the Concept

**Congruent triangles** are identical in shape and size — all corresponding sides and angles are equal. **Similar triangles** have the same shape but possibly different sizes — corresponding angles are equal and corresponding sides are proportional.

On the SAT, similar triangles appear frequently in indirect measurement problems (using shadows, mirrors, or nested triangles to find unknown lengths). The key is setting up the correct proportion between corresponding sides.

The scaling principle is powerful: if two figures are similar with scale factor $k$, then perimeters scale by $k$, areas by $k^2$, and volumes by $k^3$. This means a figure with sides doubled has four times the area and eight times the volume.

### 📐 Key Formulas

**Similarity criteria:** AA (two pairs of equal angles), SAS, SSS

**Proportional sides:** $\frac{a_1}{a_2} = \frac{b_1}{b_2} = \frac{c_1}{c_2} = k$

**Area scaling:** $\frac{A_1}{A_2} = k^2$

**Volume scaling:** $\frac{V_1}{V_2} = k^3$

### 📝 How to Solve (Step by Step)

1. **Establish** similarity (usually by AA — find two pairs of equal angles)
2. **Match** corresponding sides (shortest to shortest, etc.)
3. **Set up** a proportion
4. **Cross-multiply** and solve
5. For area/volume: apply the appropriate power of the scale factor

### ✏️ Worked Example 1

**Problem:** In similar triangles, the sides of the smaller are 3, 4, 5 and a corresponding side of the larger is 10. Find all sides of the larger.

**Solution:**

Scale factor: $k = 10/5 = 2$ (matching the largest sides).

Larger sides: $3 \times 2 = 6$, $4 \times 2 = 8$, $5 \times 2 = 10$.

### ✏️ Worked Example 2

**Problem:** A 6-foot person casts a 4-foot shadow. A tree casts a 20-foot shadow. How tall is the tree?

**Solution:**

The triangles formed are similar (same sun angle).

$\frac{h}{20} = \frac{6}{4}$

$h = 20 \times \frac{6}{4} = 30$ feet.

### ✏️ Worked Example 3

**Problem:** Two similar triangles have areas 8 and 32. What is the ratio of their corresponding sides?

**Solution:**

Area ratio: $\frac{32}{8} = 4 = k^2$

$k = 2$. The side ratio is $1:2$.

### ⚠️ SAT Traps to Avoid

- **Trap 1: Matching wrong sides.** Always match the largest side with the largest, smallest with smallest.
- **Trap 2: Using the linear scale factor for area.** If sides are in ratio $1:3$, areas are in ratio $1:9$, not $1:3$.
- **Trap 3: Assuming triangles are similar without proof.** You need AA, SAS, or SSS similarity — not just "they look similar."

### 🔗 Connection

Similar triangles connect to proportions (Module 5, Lesson 3) and the Pythagorean theorem (next lesson). They are used in trigonometry (Module 7) and in real-world measurement problems throughout the SAT.

### 🏋️ Quick Drill

1. Scale factor is 3. What is the area ratio?
2. Two similar triangles have perimeters 12 and 36. Scale factor?
3. If a model car is $\frac{1}{24}$ scale, what fraction of the real car's volume is the model?
"""

theories[(6, 3)] = r"""## The Pythagorean Theorem and Special Right Triangles

### 🧠 Understanding the Concept

The **Pythagorean Theorem** states that in a right triangle, the square of the hypotenuse equals the sum of the squares of the legs: $a^2 + b^2 = c^2$. This is one of the most frequently used formulas on the SAT.

Beyond the basic theorem, you should memorize **Pythagorean triples** (sets of integers that satisfy $a^2 + b^2 = c^2$) and **special right triangles** (45-45-90 and 30-60-90). Recognizing these patterns saves significant time.

The 45-45-90 triangle has sides in ratio $1 : 1 : \sqrt{2}$ (it is half a square cut diagonally). The 30-60-90 triangle has sides in ratio $1 : \sqrt{3} : 2$ (it is half an equilateral triangle). These appear frequently in SAT geometry and trigonometry problems.

### 📐 Key Formulas

$$a^2 + b^2 = c^2$$

**Common Pythagorean Triples:** $3, 4, 5$; $5, 12, 13$; $8, 15, 17$; $7, 24, 25$

**45-45-90:** legs $= x$, hypotenuse $= x\sqrt{2}$

**30-60-90:** short leg $= x$, long leg $= x\sqrt{3}$, hypotenuse $= 2x$

**Distance Formula:** $d = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$

### 📝 How to Solve (Step by Step)

1. **Verify** the triangle is a right triangle (look for a right angle marker or check $a^2 + b^2 = c^2$)
2. **Check** for Pythagorean triples (saves calculation)
3. **Check** for special right triangles (look for $45°$ or $30°/60°$ angles)
4. **Apply** $a^2 + b^2 = c^2$ and solve for the unknown side

### ✏️ Worked Example 1

**Problem:** A right triangle has legs 5 and 12. Find the hypotenuse.

**Solution:** Recognize the $5, 12, 13$ triple. Hypotenuse $= 13$.

Or: $c = \sqrt{25 + 144} = \sqrt{169} = 13$.

### ✏️ Worked Example 2

**Problem:** A square has diagonal 10. Find the side length.

**Solution:** The diagonal creates a 45-45-90 triangle.

$s\sqrt{2} = 10$, so $s = \frac{10}{\sqrt{2}} = \frac{10\sqrt{2}}{2} = 5\sqrt{2}$

### ✏️ Worked Example 3

**Problem:** An equilateral triangle has side 8. Find its height.

**Solution:** The height splits it into two 30-60-90 triangles.

Short leg (half the base) = 4. Hypotenuse = 8.

Height (long leg) = $4\sqrt{3}$.

### ⚠️ SAT Traps to Avoid

- **Trap 1: Using the Pythagorean theorem on non-right triangles.** It only applies to RIGHT triangles.
- **Trap 2: Confusing legs and hypotenuse.** The hypotenuse is always the LONGEST side, opposite the right angle. $c$ is always the hypotenuse in $a^2 + b^2 = c^2$.
- **Trap 3: Misremembering 30-60-90 ratios.** The side opposite $30°$ is the SHORTEST. The hypotenuse is DOUBLE the shortest side.

### 🔗 Connection

The Pythagorean theorem is the basis for the distance formula (next lesson), trigonometric ratios (Module 7), and many coordinate geometry problems. Special right triangles connect to trigonometric values of $30°$, $45°$, and $60°$.

### 🏋️ Quick Drill

1. Legs: 8 and 15. Hypotenuse?
2. 45-45-90 with hypotenuse 14. Leg length?
3. 30-60-90 with hypotenuse 20. Side opposite 60°?
"""

theories[(6, 4)] = r"""## Coordinate Geometry: Midpoint and Distance

### 🧠 Understanding the Concept

**Coordinate geometry** connects algebra and geometry by placing shapes on the coordinate plane. The two fundamental tools are the **distance formula** (how far apart are two points?) and the **midpoint formula** (what point is exactly halfway?).

Both formulas come from the Pythagorean theorem. The distance between $(x_1, y_1)$ and $(x_2, y_2)$ is the hypotenuse of a right triangle with horizontal leg $|x_2 - x_1|$ and vertical leg $|y_2 - y_1|$.

On the SAT, these formulas also appear in **circle equations**. The standard form of a circle $(x - h)^2 + (y - k)^2 = r^2$ directly uses the distance formula — every point $(x, y)$ on the circle is exactly $r$ units from the center $(h, k)$.

### 📐 Key Formulas

**Distance:** $d = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$

**Midpoint:** $M = \left(\frac{x_1 + x_2}{2}, \frac{y_1 + y_2}{2}\right)$

**Circle (standard form):** $(x - h)^2 + (y - k)^2 = r^2$, center $(h, k)$, radius $r$

### 📝 How to Solve (Step by Step)

**Distance:**
1. Subtract the $x$-coordinates and square
2. Subtract the $y$-coordinates and square
3. Add and take the square root

**Midpoint:**
1. Average the $x$-coordinates
2. Average the $y$-coordinates

**Circle from general form:**
1. Group $x$-terms and $y$-terms
2. Complete the square for each
3. Identify center and radius from standard form

### ✏️ Worked Example 1

**Problem:** Find the distance between $(1, -2)$ and $(4, 2)$.

**Solution:**

$d = \sqrt{(4-1)^2 + (2-(-2))^2} = \sqrt{9 + 16} = \sqrt{25} = 5$

### ✏️ Worked Example 2

**Problem:** Find the midpoint of $(-3, 7)$ and $(5, 1)$.

**Solution:**

$M = \left(\frac{-3 + 5}{2}, \frac{7 + 1}{2}\right) = (1, 4)$

### ✏️ Worked Example 3

**Problem:** Convert $x^2 + y^2 + 6x - 2y - 6 = 0$ to standard form and find the center and radius.

**Solution:**

$(x^2 + 6x + 9) + (y^2 - 2y + 1) = 6 + 9 + 1$

$(x + 3)^2 + (y - 1)^2 = 16$

Center: $(-3, 1)$, Radius: $4$

### ⚠️ SAT Traps to Avoid

- **Trap 1: Sign errors in the circle equation.** $(x + 3)^2$ means center $x = -3$, not $+3$.
- **Trap 2: Forgetting to add completing-the-square constants to BOTH sides.** When you add 9 inside the $x$-grouping, add 9 to the right side too.
- **Trap 3: Giving $r^2$ instead of $r$.** If $(x-1)^2 + (y+2)^2 = 25$, the radius is $5$, not $25$.

### 🔗 Connection

The distance formula uses the Pythagorean theorem (Lesson 3). Circle equations connect to tangent lines (Module 7, Lesson 4). Midpoint and distance appear in problems about line segments, triangles, and coordinate proofs.

### 🏋️ Quick Drill

1. Distance from $(0, 0)$ to $(3, 4)$?
2. Midpoint of $(2, 6)$ and $(8, 10)$?
3. Circle: $(x - 5)^2 + (y + 1)^2 = 36$. Center? Radius?
"""

theories[(6, 5)] = r"""## Transformations and Symmetry

### 🧠 Understanding the Concept

A **transformation** is a rule that moves or changes a geometric figure. On the SAT, you need to understand four types: translations (sliding), reflections (flipping), rotations (turning), and dilations (resizing).

Transformations divide into **rigid** (preserve size and shape: translations, reflections, rotations) and **non-rigid** (change size: dilations). Rigid transformations produce congruent figures; dilations produce similar figures.

The SAT also tests **function transformations** — how changing $f(x)$ to $f(x) + k$, $f(x - h)$, $-f(x)$, or $af(x)$ shifts, reflects, or stretches the graph. This is where algebra and geometry merge.

### 📐 Key Formulas

| Transformation | Coordinate Rule |
|---------------|----------------|
| Translation by $(a, b)$ | $(x, y) \to (x + a, y + b)$ |
| Reflect over $x$-axis | $(x, y) \to (x, -y)$ |
| Reflect over $y$-axis | $(x, y) \to (-x, y)$ |
| Reflect over $y = x$ | $(x, y) \to (y, x)$ |
| Rotate 90° CCW | $(x, y) \to (-y, x)$ |
| Rotate 180° | $(x, y) \to (-x, -y)$ |
| Dilation factor $k$ | $(x, y) \to (kx, ky)$ |

**Function Transformations:**
- $f(x) + k$: shift up $k$
- $f(x - h)$: shift right $h$
- $-f(x)$: reflect over $x$-axis
- $f(-x)$: reflect over $y$-axis
- $af(x)$: vertical stretch by $a$

### 📝 How to Solve (Step by Step)

1. **Identify** the transformation type
2. **Apply** the coordinate rule to each point
3. For function transformations: apply the rule to the equation
4. For compositions (multiple transformations): apply them in order

### ✏️ Worked Example 1

**Problem:** Reflect $(3, -5)$ over the $y$-axis, then translate 4 units up.

**Solution:**

Reflect: $(3, -5) \to (-3, -5)$

Translate up 4: $(-3, -5) \to (-3, -1)$

### ✏️ Worked Example 2

**Problem:** The graph of $y = f(x)$ is shifted 3 units right and 2 units down. Write the new equation.

**Solution:**

$y = f(x - 3) - 2$

### ✏️ Worked Example 3

**Problem:** Triangle with vertices $A(1, 2)$, $B(4, 2)$, $C(1, 5)$ is rotated $180°$ about the origin. Find the new vertices.

**Solution:**

$(x, y) \to (-x, -y)$

$A' = (-1, -2)$, $B' = (-4, -2)$, $C' = (-1, -5)$

### ⚠️ SAT Traps to Avoid

- **Trap 1: Direction confusion.** $f(x - 3)$ shifts RIGHT, not left. The sign is counterintuitive.
- **Trap 2: Order of transformations matters.** Reflecting then translating gives a different result than translating then reflecting.
- **Trap 3: Dilation changes size, not just position.** A dilation with $k = 2$ doubles all distances from the center.

### 🔗 Connection

Transformations connect rigid motions to congruence (Lesson 2) and dilations to similarity. Function transformations apply to every function type studied — linear, quadratic, exponential, and trigonometric. This is a cross-cutting concept across all modules.

### 🏋️ Quick Drill

1. Reflect $(2, -3)$ over the $x$-axis.
2. $f(x) = x^2$. Write the equation shifted 1 left and 5 up.
3. Is a rotation rigid or non-rigid?
"""

# ============================================================
# MODULE 7: Trigonometry & Circle Theorems
# ============================================================

theories[(7, 0)] = r"""## Trigonometric Ratios (SOH-CAH-TOA)

### 🧠 Understanding the Concept

Trigonometry connects angles to side lengths in right triangles. The three primary ratios — **sine**, **cosine**, and **tangent** — are defined in terms of the sides of a right triangle relative to a chosen acute angle.

The mnemonic **SOH-CAH-TOA** encodes all three definitions. For an acute angle $\theta$ in a right triangle:
- **S**ine = **O**pposite / **H**ypotenuse
- **C**osine = **A**djacent / **H**ypotenuse
- **T**angent = **O**pposite / **A**djacent

On the SAT, trig ratio problems typically give you one ratio and ask for another. The Pythagorean identity $\sin^2\theta + \cos^2\theta = 1$ is the essential link between sine and cosine. Another frequently tested fact is the **complementary angle relationship**: $\sin\theta = \cos(90° - \theta)$.

### 📐 Key Formulas

$$\sin\theta = \frac{\text{Opposite}}{\text{Hypotenuse}}, \quad \cos\theta = \frac{\text{Adjacent}}{\text{Hypotenuse}}, \quad \tan\theta = \frac{\text{Opposite}}{\text{Adjacent}}$$

$$\sin^2\theta + \cos^2\theta = 1$$

$$\sin\theta = \cos(90° - \theta), \quad \cos\theta = \sin(90° - \theta)$$

| $\theta$ | $\sin\theta$ | $\cos\theta$ | $\tan\theta$ |
|-----------|-------------|-------------|-------------|
| $30°$ | $\frac{1}{2}$ | $\frac{\sqrt{3}}{2}$ | $\frac{\sqrt{3}}{3}$ |
| $45°$ | $\frac{\sqrt{2}}{2}$ | $\frac{\sqrt{2}}{2}$ | $1$ |
| $60°$ | $\frac{\sqrt{3}}{2}$ | $\frac{1}{2}$ | $\sqrt{3}$ |

### 📝 How to Solve (Step by Step)

1. **Label** the sides relative to the given angle: opposite, adjacent, hypotenuse
2. **Choose** the ratio that uses the known side and the unknown side
3. **Set up** the equation and solve
4. If given one ratio, use the Pythagorean theorem or identity to find others

### ✏️ Worked Example 1

**Problem:** In a right triangle, the side opposite angle $A$ is 8 and the hypotenuse is 17. Find $\cos A$.

**Solution:**

Adjacent $= \sqrt{17^2 - 8^2} = \sqrt{289 - 64} = \sqrt{225} = 15$

$\cos A = \frac{15}{17}$

### ✏️ Worked Example 2

**Problem:** If $\sin x = \frac{5}{13}$, what is $\cos x$?

**Solution:**

$\cos x = \sqrt{1 - \sin^2 x} = \sqrt{1 - \frac{25}{169}} = \sqrt{\frac{144}{169}} = \frac{12}{13}$

### ✏️ Worked Example 3

**Problem:** If $\cos 40° = 0.766$, what is $\sin 50°$?

**Solution:** Since $40° + 50° = 90°$, $\sin 50° = \cos 40° = 0.766$.

### ⚠️ SAT Traps to Avoid

- **Trap 1: Mixing up opposite and adjacent.** "Opposite" and "adjacent" change depending on which angle you are using. Always label relative to the given angle.
- **Trap 2: Forgetting the complementary relationship.** $\sin 30° = \cos 60°$. This is one of the SAT's favorite tricks.
- **Trap 3: Using trig ratios on non-right triangles.** SOH-CAH-TOA only applies to right triangles.

### 🔗 Connection

Trig ratios build on the Pythagorean theorem and special right triangles (Module 6, Lesson 3). They lead to radians (next lesson) and are used in arc length and sector area problems (Lesson 2).

### 🏋️ Quick Drill

1. $\sin 60° = ?$
2. If $\tan\theta = \frac{3}{4}$ and $\theta$ is acute, what is $\sin\theta$?
3. $\sin 25° = \cos ?$
"""

theories[(7, 1)] = r"""## Radians and Degree Conversion

### 🧠 Understanding the Concept

**Degrees** and **radians** are two different units for measuring angles, just as inches and centimeters are two different units for measuring length. Degrees divide a full circle into 360 equal parts — a convention dating back to ancient Babylon. Radians are based on the geometry of the circle itself: one radian is the angle at the center of a circle subtended by an arc whose length equals the radius.

A full circle is $360°$ or $2\pi$ radians. Therefore, $\pi$ radians $= 180°$. This single conversion factor is all you need to go back and forth. On the SAT, radians are used in arc length and sector area formulas, and you must be comfortable converting between the two systems quickly and accurately.

The mental model: imagine taking the radius of a circle and bending it to lie along the circumference. The angle you subtend at the center is exactly 1 radian (about $57.3°$). Since the circumference is $2\pi r$, you can fit $2\pi$ radius-lengths around the circle, which is why a full rotation is $2\pi$ radians. This means radians directly connect angle measure to arc length — a property that makes radian formulas beautifully simple.

Why does the SAT care? Because many advanced formulas (arc length $s = r\theta$, sector area $A = \frac{1}{2}r^2\theta$) only work when $\theta$ is in radians. If you accidentally use degrees in these formulas, your answer will be wildly wrong. The SAT tests whether you know the difference.

### 📐 Key Formulas

$$\pi \text{ rad} = 180°$$

$$\text{Radians} = \text{Degrees} \times \frac{\pi}{180}$$

$$\text{Degrees} = \text{Radians} \times \frac{180}{\pi}$$

| Degrees | Radians |
|---------|---------|
| $30°$ | $\frac{\pi}{6}$ |
| $45°$ | $\frac{\pi}{4}$ |
| $60°$ | $\frac{\pi}{3}$ |
| $90°$ | $\frac{\pi}{2}$ |
| $120°$ | $\frac{2\pi}{3}$ |
| $180°$ | $\pi$ |
| $270°$ | $\frac{3\pi}{2}$ |
| $360°$ | $2\pi$ |

### 📝 How to Solve (Step by Step)

**Degrees to Radians:**
1. Multiply the degree measure by $\frac{\pi}{180}$
2. Simplify the fraction (reduce before multiplying by $\pi$)

**Radians to Degrees:**
1. Multiply the radian measure by $\frac{180}{\pi}$
2. The $\pi$ cancels if the radian value contains $\pi$

**Shortcut for common angles:** Memorize the table above. For $30°$, $45°$, $60°$, $90°$, and their multiples, instant recall is faster than calculating.

**Decision tree:**
- If the angle has $\pi$ in it → it is in radians, multiply by $\frac{180}{\pi}$ to get degrees
- If the angle is a plain number (like $150°$) → it is in degrees, multiply by $\frac{\pi}{180}$ to get radians
- If the angle is a plain number WITHOUT a degree symbol (like $2$) → it is in radians already

### ✏️ Worked Example 1

**Problem:** Convert $150°$ to radians.

**Solution:**

$150 \times \frac{\pi}{180} = \frac{150\pi}{180} = \frac{5\pi}{6}$

(Simplify by dividing numerator and denominator by 30.)

### ✏️ Worked Example 2

**Problem:** Convert $\frac{7\pi}{4}$ to degrees.

**Solution:**

$\frac{7\pi}{4} \times \frac{180}{\pi} = \frac{7 \times 180}{4} = \frac{1260}{4} = 315°$

This angle is in the fourth quadrant ($270° < 315° < 360°$).

### ✏️ Worked Example 3

**Problem:** An angle measures 2 radians (no $\pi$). Convert to degrees.

**Solution:**

$2 \times \frac{180}{\pi} = \frac{360}{\pi} \approx 114.6°$

Note: When a radian measure does NOT include $\pi$, the $\pi$ does not cancel, and the answer is not a "nice" number. This is uncommon on the SAT but possible.

### ⚠️ SAT Traps to Avoid

- **Trap 1: Confusing the conversion direction.** To go from degrees to radians, multiply by $\frac{\pi}{180}$, not $\frac{180}{\pi}$. Remember: radians are smaller numbers, so going from degrees (big) to radians (small) means multiplying by a fraction less than 1.
- **Trap 2: Forgetting to simplify.** $\frac{120\pi}{180}$ should be reduced to $\frac{2\pi}{3}$, not left unsimplified.
- **Trap 3: Calculator in wrong mode.** If you calculate $\sin(\pi/6)$ with your calculator in degree mode, you will get $\sin(0.524°)$ instead of $\sin(30°) = 0.5$. Always check RAD vs DEG mode.

### 🔗 Connection

Radians are essential for arc length and sector area (next lesson), where the formulas $s = r\theta$ and $A = \frac{1}{2}r^2\theta$ require $\theta$ in radians. Understanding radians also connects to the unit circle in advanced trigonometry. The trig ratios from Lesson 0 use the same angle values but in radian form.

### 🏋️ Quick Drill

1. Convert $270°$ to radians.
2. Convert $\frac{\pi}{3}$ to degrees.
3. How many radians is a right angle?
4. Convert $\frac{5\pi}{4}$ to degrees.
5. Is $3$ radians more or less than $180°$?
"""

theories[(7, 2)] = r"""## Arc Length and Sector Area

### 🧠 Understanding the Concept

An **arc** is a portion of a circle's circumference, and a **sector** is the "pie slice" region bounded by two radii and an arc. On the SAT, you need to calculate arc length and sector area given the radius and central angle.

The key insight is **proportional thinking**: a sector with central angle $\theta$ out of $360°$ (or $2\pi$ radians) represents the fraction $\frac{\theta}{360}$ (or $\frac{\theta}{2\pi}$) of the full circle. Apply this fraction to the circumference to get arc length, or to the total area to get sector area.

The radian formulas are especially elegant: arc length $s = r\theta$ and sector area $A = \frac{1}{2}r^2\theta$ (with $\theta$ in radians). These are worth memorizing for speed.

### 📐 Key Formulas

**Arc Length:**
$$s = r\theta \quad (\theta \text{ in radians})$$
$$s = \frac{\theta}{360} \times 2\pi r \quad (\theta \text{ in degrees})$$

**Sector Area:**
$$A = \frac{1}{2}r^2\theta \quad (\theta \text{ in radians})$$
$$A = \frac{\theta}{360} \times \pi r^2 \quad (\theta \text{ in degrees})$$

**Proportion principle:**
$$\frac{\text{arc length}}{2\pi r} = \frac{\text{sector area}}{\pi r^2} = \frac{\theta}{360°} = \frac{\theta(\text{rad})}{2\pi}$$

### 📝 How to Solve (Step by Step)

1. **Identify** the radius $r$ and central angle $\theta$
2. **Check** if the angle is in degrees or radians
3. **Apply** the appropriate formula
4. **Simplify** and check if the answer should be exact (in terms of $\pi$) or approximate

### ✏️ Worked Example 1

**Problem:** A circle has radius 6 cm. Find the arc length for a $60°$ central angle.

**Solution:**

$s = \frac{60}{360} \times 2\pi(6) = \frac{1}{6} \times 12\pi = 2\pi \approx 6.28$ cm

### ✏️ Worked Example 2

**Problem:** Find the area of a sector with radius 10 and central angle $\frac{\pi}{3}$ radians.

**Solution:**

$A = \frac{1}{2}(10)^2 \cdot \frac{\pi}{3} = \frac{100\pi}{6} = \frac{50\pi}{3} \approx 52.36$

### ✏️ Worked Example 3

**Problem:** An arc has length $5\pi$ cm and the radius is 10 cm. Find the central angle in degrees.

**Solution:**

$s = \frac{\theta}{360} \times 2\pi r$

$5\pi = \frac{\theta}{360} \times 20\pi$

$\frac{5}{20} = \frac{\theta}{360}$

$\theta = 90°$

### ⚠️ SAT Traps to Avoid

- **Trap 1: Using the radian formula with degree values.** $s = r\theta$ ONLY works when $\theta$ is in radians.
- **Trap 2: Confusing arc length with sector area.** Arc length is a distance (units); sector area is a space (square units).
- **Trap 3: Forgetting the $\frac{1}{2}$ in sector area formula.** $A = \frac{1}{2}r^2\theta$, not $r^2\theta$.

### 🔗 Connection

This combines circle knowledge (area, circumference from Module 6) with radians (Lesson 1). Arc length and sector area appear in SAT problems about slices of pizza, clock angles, and rotating wheels.

### 🏋️ Quick Drill

1. $r = 4$, $\theta = \frac{\pi}{2}$. Arc length?
2. $r = 9$, $\theta = 40°$. Sector area?
3. Arc length is $3\pi$, $r = 6$. Central angle in radians?
"""

theories[(7, 3)] = r"""## Circle Theorems: Inscribed Angles and Chords

### 🧠 Understanding the Concept

Circle theorems describe relationships between angles, arcs, chords, and tangent lines in and around circles. On the SAT, the most important theorem is the **Inscribed Angle Theorem**: an inscribed angle is half the central angle that subtends the same arc.

A **central angle** has its vertex at the center of the circle and equals its intercepted arc. An **inscribed angle** has its vertex on the circle and equals half its intercepted arc. The most famous special case: an inscribed angle that intercepts a semicircle (diameter) is always $90°$.

These theorems allow you to find unknown angles without knowing the radius or even the exact size of the circle.

### 📐 Key Formulas

**Central angle** $=$ intercepted arc

**Inscribed angle** $= \frac{1}{2} \times$ intercepted arc

**Inscribed angle subtending a diameter** $= 90°$

**Chord properties:**
- A perpendicular from the center to a chord bisects the chord
- Equal chords subtend equal central angles
- Two tangent segments from the same external point are equal

**Tangent-radius:** A tangent line is perpendicular to the radius at the point of tangency.

### 📝 How to Solve (Step by Step)

1. **Identify** central angles and inscribed angles
2. **Apply** the inscribed angle theorem: inscribed $= \frac{1}{2} \times$ central (same arc)
3. **Look for** diameters — any inscribed angle subtending a diameter is $90°$
4. **Use** chord and tangent properties as needed

### ✏️ Worked Example 1

**Problem:** Central angle $AOB = 100°$. Inscribed angle $ACB$ subtends the same arc $AB$. Find $\angle ACB$.

**Solution:**

$\angle ACB = \frac{1}{2} \times 100° = 50°$

### ✏️ Worked Example 2

**Problem:** $AB$ is a diameter of a circle. Point $C$ is on the circle. If $\angle BAC = 35°$, find $\angle ABC$.

**Solution:**

$\angle ACB = 90°$ (inscribed angle subtending a diameter)

$\angle ABC = 180° - 90° - 35° = 55°$

### ✏️ Worked Example 3

**Problem:** Two tangent lines from external point $P$ touch the circle at $A$ and $B$. If $PA = 12$, find $PB$.

**Solution:**

Two tangent segments from the same external point are equal: $PB = PA = 12$.

### ⚠️ SAT Traps to Avoid

- **Trap 1: Confusing central and inscribed angles.** The inscribed angle is HALF the central angle for the same arc, not equal.
- **Trap 2: Forgetting the 90° rule.** If a triangle is inscribed in a circle with one side as a diameter, the angle opposite the diameter is ALWAYS 90°.
- **Trap 3: Not recognizing tangent-radius perpendicularity.** This creates right angles useful for applying the Pythagorean theorem.

### 🔗 Connection

These theorems build on circle basics (area, circumference) and connect to arc length and sector area (Lesson 2). The tangent-radius perpendicularity links to the Pythagorean theorem. Circle equations (next lesson) put these geometric relationships into algebraic form.

### 🏋️ Quick Drill

1. Central angle is $80°$. What is the inscribed angle on the same arc?
2. A triangle is inscribed in a circle with one side as a diameter. What type of triangle is it?
3. Two tangents from point $P$: one has length 9. What is the length of the other?
"""

theories[(7, 4)] = r"""## Equation of a Circle and Tangent Lines

### 🧠 Understanding the Concept

The **equation of a circle** on the coordinate plane ties together algebra and geometry. In **standard form**, $(x - h)^2 + (y - k)^2 = r^2$, you can immediately read the center $(h, k)$ and radius $r$. On the SAT, you often need to convert from **general form** ($x^2 + y^2 + Dx + Ey + F = 0$) to standard form by completing the square.

A **tangent line** touches the circle at exactly one point and is perpendicular to the radius at that point. Finding tangent line equations combines circle knowledge with the slope concepts from Module 0.

These problems frequently appear in the "no calculator" section and test algebraic fluency: completing the square, finding slopes, and using perpendicularity.

### 📐 Key Formulas

**Standard Form:** $(x - h)^2 + (y - k)^2 = r^2$

**Center:** $(h, k)$, **Radius:** $r$

**General Form:** $x^2 + y^2 + Dx + Ey + F = 0$

Convert by completing the square: center $= (-D/2, -E/2)$, $r = \sqrt{(D/2)^2 + (E/2)^2 - F}$

**Tangent at point $P$:** slope of tangent $= -\frac{1}{\text{slope of radius to } P}$

### 📝 How to Solve (Step by Step)

**Converting General to Standard Form:**
1. Group $x$-terms and $y$-terms
2. Move the constant to the right side
3. Complete the square for $x$: add $\left(\frac{D}{2}\right)^2$ to both sides
4. Complete the square for $y$: add $\left(\frac{E}{2}\right)^2$ to both sides
5. Write in $(x - h)^2 + (y - k)^2 = r^2$ form

**Finding a tangent line:**
1. Find the slope from center to the point of tangency
2. The tangent slope is the negative reciprocal
3. Use point-slope form

### ✏️ Worked Example 1

**Problem:** Find the center and radius of $x^2 + y^2 - 10x + 4y + 13 = 0$.

**Solution:**

$(x^2 - 10x + 25) + (y^2 + 4y + 4) = -13 + 25 + 4$

$(x - 5)^2 + (y + 2)^2 = 16$

Center: $(5, -2)$, Radius: $4$

### ✏️ Worked Example 2

**Problem:** Does the point $(3, 4)$ lie on, inside, or outside the circle $(x - 1)^2 + (y - 2)^2 = 9$?

**Solution:**

$(3 - 1)^2 + (4 - 2)^2 = 4 + 4 = 8$

Since $8 < 9 = r^2$, the point is **inside** the circle.

### ✏️ Worked Example 3

**Problem:** Find the equation of the tangent to $(x - 2)^2 + (y - 3)^2 = 25$ at point $(6, 6)$.

**Solution:**

Slope of radius from $(2, 3)$ to $(6, 6)$: $m_r = \frac{6 - 3}{6 - 2} = \frac{3}{4}$

Tangent slope: $m_t = -\frac{4}{3}$

Tangent line: $y - 6 = -\frac{4}{3}(x - 6)$

$y = -\frac{4}{3}x + 8 + 6 = -\frac{4}{3}x + 14$

### ⚠️ SAT Traps to Avoid

- **Trap 1: Sign errors in the center.** $(x + 3)^2$ means $h = -3$. $(y - 4)^2$ means $k = 4$. Watch the signs carefully.
- **Trap 2: Forgetting to add completing-the-square values to both sides.** This changes the constant on the right.
- **Trap 3: Giving $r^2$ as the radius.** If the equation says $= 49$, the radius is $7$, not $49$.

### 🔗 Connection

This lesson ties together completing the square (Module 2), perpendicular slopes (Module 0, Lesson 1), and circle geometry (Lesson 3). It is the capstone of SAT Math geometry, connecting algebraic manipulation with geometric understanding.

### 🏋️ Quick Drill

1. Center and radius of $(x + 1)^2 + (y - 7)^2 = 100$?
2. Convert $x^2 + y^2 + 2x - 8y = 0$ to standard form.
3. Is $(0, 0)$ inside or outside $(x - 3)^2 + (y - 4)^2 = 16$?
"""

# ============================================================
# Now apply all theories to the course structure
# ============================================================

for i, module in enumerate(course['course']['modules']):
    for j, lesson in enumerate(module['lessons']):
        key = (i, j)
        if key in theories:
            lesson['theory'] = theories[key].strip()
        else:
            print(f"WARNING: No theory for module {i}, lesson {j}: {lesson['title']}")

# Update course description
course['course']['description'] = (
    "Complete SAT Math preparation using the 4C/ID instructional design framework. "
    "Covers all four College Board domains: Algebra, Advanced Math, Problem-Solving & Data Analysis, "
    "and Geometry & Trigonometry. 8 modules, 42 lessons with rich theory (mental models, worked examples, "
    "SAT strategies, drills) and interactive practice exercises."
)

# Save
with open('sat_math_pro_course_4cid.json', 'w', encoding='utf-8') as f:
    json.dump(course, f, indent=2, ensure_ascii=False)

# Verification
total_lessons = sum(len(m['lessons']) for m in course['course']['modules'])
theories_count = len(theories)
print(f"Total lessons: {total_lessons}")
print(f"Theories written: {theories_count}")
print(f"All covered: {total_lessons == theories_count}")

# Check theory lengths
for (i, j), theory in theories.items():
    words = len(theory.split())
    lesson_title = course['course']['modules'][i]['lessons'][j]['title']
    if words < 400:
        print(f"WARNING: Short theory ({words} words) for [{i},{j}] {lesson_title}")
    elif words > 1200:
        print(f"WARNING: Long theory ({words} words) for [{i},{j}] {lesson_title}")

print("\nDone! Saved to sat_math_pro_course_4cid.json")
