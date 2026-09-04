//! Percentile maths. Pure, integral inputs, no host calls.

/// Linear-interpolation percentile over an already-sorted slice, matching the
/// definition used by NumPy's default and by every compensation survey a
/// consortium member is likely to compare against.
///
/// `p` is expressed in whole percent, 0..=100. Returns `None` for an empty
/// slice rather than a misleading zero.
pub fn percentile(sorted: &[u64], p: u64) -> Option<u64> {
    if sorted.is_empty() {
        return None;
    }
    if sorted.len() == 1 {
        return Some(sorted[0]);
    }
    let p = p.min(100) as f64;
    let rank = (p / 100.0) * (sorted.len() - 1) as f64;
    let lo = rank.floor() as usize;
    let hi = rank.ceil() as usize;
    if lo == hi {
        return Some(sorted[lo]);
    }
    let frac = rank - lo as f64;
    let span = sorted[hi] as f64 - sorted[lo] as f64;
    Some((sorted[lo] as f64 + span * frac).round() as u64)
}

/// Arithmetic mean, rounded to the nearest minor unit. Accumulates in `u128`
/// so a large cell of high-currency values cannot overflow.
pub fn mean(values: &[u64]) -> Option<u64> {
    if values.is_empty() {
        return None;
    }
    let total: u128 = values.iter().map(|v| *v as u128).sum();
    let n = values.len() as u128;
    Some(((total + n / 2) / n) as u64)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_input_has_no_percentile() {
        assert_eq!(percentile(&[], 50), None);
        assert_eq!(mean(&[]), None);
    }

    #[test]
    fn single_value_is_every_percentile() {
        assert_eq!(percentile(&[42], 10), Some(42));
        assert_eq!(percentile(&[42], 90), Some(42));
    }

    #[test]
    fn median_of_even_count_interpolates() {
        // Midpoint of 20 and 30.
        assert_eq!(percentile(&[10, 20, 30, 40], 50), Some(25));
    }

    #[test]
    fn quartiles_match_linear_interpolation() {
        let v = [100, 200, 300, 400, 500];
        assert_eq!(percentile(&v, 0), Some(100));
        assert_eq!(percentile(&v, 25), Some(200));
        assert_eq!(percentile(&v, 50), Some(300));
        assert_eq!(percentile(&v, 75), Some(400));
        assert_eq!(percentile(&v, 100), Some(500));
    }

    #[test]
    fn percentile_is_monotonic() {
        let v: Vec<u64> = (1..=100).map(|i| i * 1_000).collect();
        let mut last = 0;
        for p in 0..=100 {
            let got = percentile(&v, p).unwrap();
            assert!(got >= last, "p{p} went backwards: {got} < {last}");
            last = got;
        }
    }

    #[test]
    fn mean_rounds_half_up() {
        assert_eq!(mean(&[1, 2]), Some(2));
        assert_eq!(mean(&[1, 1, 2]), Some(1));
    }

    #[test]
    fn mean_does_not_overflow_on_large_cells() {
        let v = vec![u64::MAX / 2; 64];
        assert_eq!(mean(&v), Some(u64::MAX / 2));
    }
}
