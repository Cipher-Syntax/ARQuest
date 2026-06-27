def get_rank_info(exp):
    """
    Returns rank information based on user's exploration points.
    Ranks:
      1: Freshman (0)
      2: Explorer (100)
      3: Scout (300)
      4: Ranger (600)
      5: Veteran (1000)
      6: Campus Legend (2000)
    """
    ranks = [
        {'level': 1, 'title': 'Freshman', 'min_exp': 0, 'icon': '🎒'},
        {'level': 2, 'title': 'Explorer', 'min_exp': 100, 'icon': '🗺️'},
        {'level': 3, 'title': 'Scout', 'min_exp': 300, 'icon': '⛺'},
        {'level': 4, 'title': 'Ranger', 'min_exp': 600, 'icon': '🦅'},
        {'level': 5, 'title': 'Veteran', 'min_exp': 1000, 'icon': '⚔️'},
        {'level': 6, 'title': 'Campus Legend', 'min_exp': 2000, 'icon': '👑'},
    ]
    
    current_rank = ranks[0]
    next_rank = ranks[1]
    
    for i in range(len(ranks)):
        if exp >= ranks[i]['min_exp']:
            current_rank = ranks[i]
            if i + 1 < len(ranks):
                next_rank = ranks[i+1]
            else:
                next_rank = None
        else:
            break
            
    return {
        'level': current_rank['level'],
        'title': current_rank['title'],
        'icon': current_rank['icon'],
        'current_rank_exp': current_rank['min_exp'],
        'next_rank_exp': next_rank['min_exp'] if next_rank else None,
        'exp_to_next_rank': (next_rank['min_exp'] - exp) if next_rank else 0,
        'progress_percentage': round(((exp - current_rank['min_exp']) / (next_rank['min_exp'] - current_rank['min_exp']) * 100)) if next_rank else 100
    }
