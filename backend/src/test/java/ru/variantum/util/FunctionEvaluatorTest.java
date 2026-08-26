package ru.variantum.util;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class FunctionEvaluatorTest {
    private final FunctionEvaluator math = new FunctionEvaluator();
    @Test void usesTheSameMathRulesAsTheBrowser() {
        assertEquals(-9, math.evaluate("-x^2", 3));
        assertEquals(512, math.evaluate("2^3^2", 0));
        assertEquals(1, math.evaluate("sin(pi/2)", 0), 1e-10);
        assertEquals(2.001, math.evaluate("1e-3+x", 2), 1e-10);
        assertEquals(2, math.evaluate("log(100)", 0));
        assertEquals(3, math.evaluate("Math.sqrt(t^2)", 3));
    }
    @Test void rejectsIncompleteAndNonMathematicalInput() {
        for (String value : new String[]{"1+", "sin(x", "x;1", "fetch(1)", "x.constructor"}) {
            assertThrows(IllegalArgumentException.class, () -> math.evaluate(value, 2));
        }
    }
}
