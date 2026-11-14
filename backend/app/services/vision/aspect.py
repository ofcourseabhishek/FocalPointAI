def aspect(rating, works, improvable, assessment, edit, try_this, saw=None) -> dict:
    """Shape one graded aspect the way the result page reads it. `saw` defaults to
    the improvement note, which is what most aspects show as the observation."""
    return {
        "rating": rating,
        "what_works": works,
        "what_could_be_improved": improvable,
        "assessment": assessment,
        "saw": improvable if saw is None else saw,
        "improve": edit,
        "try_this": try_this,
    }
