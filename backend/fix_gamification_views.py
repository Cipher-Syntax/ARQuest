import os

file_path = "apps/gamification/views.py"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add imports if not present
imports_to_add = """from rest_framework.decorators import api_view, permission_classes
from apps.api.responses import success_response, error_response
from apps.api.errors import ErrorCodes
"""

if "api_view" not in content:
    lines = content.split('\n')
    lines.insert(4, imports_to_add)
    content = '\n'.join(lines)

functions_to_add = """

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def quest_list_create(request):
    if request.method == 'GET':
        quests = Quest.objects.all().order_by('-created_at')
        return success_response(QuestSerializer(quests, many=True).data)
    elif request.method == 'POST':
        if not request.user.is_admin_role:
            return error_response(ErrorCodes.PERMISSION_DENIED, 'Admin access required', status_code=status.HTTP_403_FORBIDDEN)
        
        from apps.api.models import SystemSetting
        if 'reward_points' not in request.data or not request.data.get('reward_points'):
            if hasattr(request.data, '_mutable'):
                request.data._mutable = True
            request.data['reward_points'] = SystemSetting.get_settings().default_quest_reward
            
        serializer = QuestSerializer(data=request.data)
        if serializer.is_valid():
            quest = serializer.save()
            
            # Send Push Notification
            try:
                from apps.authentication.models import UserDevice
                from apps.core.notifications import send_push_notifications
                
                tokens = UserDevice.objects.values_list('push_token', flat=True)
                
                if tokens:
                    messages = [{
                        "to": token,
                        "title": f"New Quest: {quest.title}",
                        "body": "Tap to view your new mission!",
                        "data": {"type": "quest", "quest_id": str(quest.id)}
                    } for token in set(tokens)]
                    
                    send_push_notifications(messages)
            except Exception as e:
                print(f"Error sending notifications: {e}")
                
            return success_response(serializer.data, status_code=status.HTTP_201_CREATED)
        return error_response(ErrorCodes.VALIDATION_ERROR, 'Invalid data', status_code=status.HTTP_400_BAD_REQUEST, details=serializer.errors)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def quest_detail(request, id):
    if not request.user.is_admin_role:
        return error_response(ErrorCodes.PERMISSION_DENIED, 'Admin access required', status_code=status.HTTP_403_FORBIDDEN)
    try:
        quest = Quest.objects.get(id=id)
    except Quest.DoesNotExist:
        return error_response(ErrorCodes.NOT_FOUND, 'Quest not found', status_code=status.HTTP_404_NOT_FOUND)

    if request.method == 'PATCH':
        serializer = QuestSerializer(quest, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return success_response(serializer.data)
        return error_response(ErrorCodes.VALIDATION_ERROR, 'Invalid data', status_code=status.HTTP_400_BAD_REQUEST, details=serializer.errors)
    elif request.method == 'DELETE':
        quest.delete()
        return success_response({'message': 'Quest deleted'})
"""

if "def quest_list_create" not in content:
    content += functions_to_add

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully fixed gamification/views.py")
