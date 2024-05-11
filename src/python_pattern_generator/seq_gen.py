import json
from colour import Color
import random

gradient_duration = 5 * 1000
effects_duration_range = random.randint(3000, 6000)
frame_length_ms = 500

def generate_gradient(start_color, end_color, steps, start_time, duration):
    color_list = list(Color(start_color).range_to(Color(end_color), steps))
    return [
        {
            "start": start_time + i * duration,
            "end": start_time + (i + 1) * duration,
            "color": color.hex_l
        }
        for i, color in enumerate(color_list)
    ]

def generate_pulse(start_color, times, start_time, duration):
    return [
        {
            "start": start_time + i * duration,
            "end": start_time + (i + 1) * duration,
            "color": start_color
        }
        for i in range(times) if i % 4 > 1
    ]

def generate_random_color_sequence(num_leds, start_time, duration):
    return [
        {
            "start": start_time + i * duration,
            "end": start_time + (i + 1) * duration,
            "color": Color(hue=random.random(), saturation=1, luminance=0.5).hex_l
        }
        for i in range(num_leds)
    ]

def create_led_sequences(led_counts, track_duration_minutes):
    parts = ["head_front", "head_back", "body_front", "body_back", "left_hand_front", "left_hand_back", "right_hand_front", "right_hand_back", "left_leg_front", "left_leg_back", "right_leg_front", "right_leg_back"]
    global_id = 0  # Глобальный идентификатор для уникальности
    track_duration_seconds = track_duration_minutes * 60
    seqs = []
    start_colors = ["#FFBABA", "#B3FFBA", "#BAE1FF", "#FFFFBA", "#FFBAF0", "#BAFFC9", "#BAC6FF", "#FFD3BA", "#FFBAB2", "#BABAFF"]
    end_colors = ["#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF", "#00008B", "#FF4500", "#8B0000", "#0000CD"]


    for i, part in enumerate(parts):
        num_leds = led_counts.get(part, 10)
        sequence = []
        start_time = 0

        while start_time < track_duration_seconds:
            start_color = random.choice(start_colors)
            duration = 5000 if 'body' in part else effects_duration_range  # Body parts get a fixed 5 second interval, others are random between 1-3 seconds
            if 'head' in part:
                sequence += generate_pulse(start_color, duration // frame_length_ms, start_time, frame_length_ms)
            elif 'hand' in part:
                sequence += generate_random_color_sequence(duration // frame_length_ms, start_time, frame_length_ms)
            else:

                end_color = random.choice(end_colors)
                sequence += generate_gradient(start_color, end_color, duration // frame_length_ms, start_time, frame_length_ms)
            start_time += duration

        seqs.append({
            "id": global_id,
            "sequence": sequence,
            "leds": [f"{part}_{n}" for n in range(num_leds)]
        })
        global_id += 1

    led_data = {
        "seqs": seqs,
        "currentTime": 10
    }

    with open("/Users/apple/Documents/GitHub/Electron Apps/ElectronApp LedCostumeApp/data_costumes/led_sequences.json", "w") as f:
        json.dump({
            "music": {"filename": "/Users/apple/Documents/GitHub/Electron Apps/ElectronApp LedCostumeApp/data_costumes/music.mp3"},
            "pattern": led_data
        }, f)

    print("JSON файл успешно создан и сохранен.")


# Предположим, трек длится 3 минуты
track_duration_minutes = 1000 * 30
# Получение входных данных от пользователя или из другого источника
led_counts = {
    "head_front": 10,
    "head_back": 10,
    "body_front": 5,
    "body_back": 5,
    "left_hand_front": 10,
    "left_hand_back": 10,
    "right_hand_front": 10,
    "right_hand_back": 10,
    "left_leg_front": 8,
    "left_leg_back": 8,
    "right_leg_front": 8,
    "right_leg_back": 8
}

# Вызов функции с пользовательскими данными
create_led_sequences(led_counts, track_duration_minutes)
