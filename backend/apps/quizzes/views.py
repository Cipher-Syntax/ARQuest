from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.db import transaction

from apps.api.responses import success_response, error_response
from apps.api.errors import ErrorCodes
from apps.authentication.permissions import IsStudentRole
from apps.buildings.models import Building
from .models import QuizQuestion, UserQuizProgress
from .serializers import QuizQuestionSerializer

class BuildingQuizView(APIView):
    permission_classes = [IsAuthenticated, IsStudentRole]
    
    def get(self, request, id):
        try:
            building = Building.objects.get(id=id, is_active=True)
        except Building.DoesNotExist:
            return error_response(ErrorCodes.NOT_FOUND, 'Building not found', status_code=status.HTTP_404_NOT_FOUND)
        
        answered_ids = UserQuizProgress.objects.filter(user=request.user, is_correct=True).values_list('question_id', flat=True)
        questions = list(QuizQuestion.objects.filter(building=building, is_active=True).exclude(id__in=answered_ids))
        
        if not questions:
            return success_response([])
            
        import random
        random.shuffle(questions)
        serializer = QuizQuestionSerializer(questions, many=True)
        return success_response(serializer.data)


class AnswerQuizView(APIView):
    permission_classes = [IsAuthenticated, IsStudentRole]
    
    def post(self, request):
        question_id = request.data.get('question_id')
        selected_option = request.data.get('selected_option')
        
        if not question_id or not selected_option:
            return error_response(ErrorCodes.INVALID_INPUT, 'question_id and selected_option are required')
            
        try:
            question = QuizQuestion.objects.get(id=question_id, is_active=True)
        except QuizQuestion.DoesNotExist:
            return error_response(ErrorCodes.NOT_FOUND, 'Question not found', status_code=status.HTTP_404_NOT_FOUND)
            
        is_correct = (selected_option.upper() == question.correct_option.upper())
        exp_awarded = 0
        newly_earned_badges = []
        
        with transaction.atomic():
            progress, created = UserQuizProgress.objects.get_or_create(user=request.user, question=question)
            progress = UserQuizProgress.objects.select_for_update().get(id=progress.id)
            
            if progress.is_correct:
                return error_response(ErrorCodes.VALIDATION_ERROR, 'You have already answered this question correctly')
                
            progress.is_correct = is_correct
            progress.save()
            
            if is_correct:
                request.user.gain_exp(question.exp_reward)
                exp_awarded = question.exp_reward
                
                from apps.gamification.utils import check_and_award_point_badges
                newly_earned_badges = check_and_award_point_badges(request.user)
                
        return success_response({
            'is_correct': is_correct,
            'exp_awarded': exp_awarded,
            'newly_earned_badges': newly_earned_badges
        })


class QuizQuestionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        building_id = request.query_params.get('building_id')
        if building_id:
            questions = QuizQuestion.objects.filter(building_id=building_id).order_by('-created_at')
        else:
            questions = QuizQuestion.objects.all().order_by('-created_at')
        return success_response(QuizQuestionSerializer(questions, many=True).data)

    def post(self, request):
        if not request.user.is_admin_role:
            return error_response(ErrorCodes.PERMISSION_DENIED, 'Admin access required', status_code=status.HTTP_403_FORBIDDEN)
        serializer = QuizQuestionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return success_response(serializer.data, status_code=status.HTTP_201_CREATED)
        return error_response(ErrorCodes.INVALID_INPUT, 'Invalid data', details=serializer.errors)


class QuizQuestionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            question = QuizQuestion.objects.get(id=pk)
        except QuizQuestion.DoesNotExist:
            return error_response(ErrorCodes.NOT_FOUND, 'Question not found', status_code=status.HTTP_404_NOT_FOUND)
        return success_response(QuizQuestionSerializer(question).data)

    def put(self, request, pk):
        if not request.user.is_admin_role:
            return error_response(ErrorCodes.PERMISSION_DENIED, 'Admin access required', status_code=status.HTTP_403_FORBIDDEN)
        try:
            question = QuizQuestion.objects.get(id=pk)
        except QuizQuestion.DoesNotExist:
            return error_response(ErrorCodes.NOT_FOUND, 'Question not found', status_code=status.HTTP_404_NOT_FOUND)
            
        serializer = QuizQuestionSerializer(question, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return success_response(serializer.data)
        return error_response(ErrorCodes.INVALID_INPUT, 'Invalid data', details=serializer.errors)

    def delete(self, request, pk):
        if not request.user.is_admin_role:
            return error_response(ErrorCodes.PERMISSION_DENIED, 'Admin access required', status_code=status.HTTP_403_FORBIDDEN)
        try:
            question = QuizQuestion.objects.get(id=pk)
            question.delete()
            return success_response({'message': 'Deleted successfully'})
        except QuizQuestion.DoesNotExist:
            return error_response(ErrorCodes.NOT_FOUND, 'Question not found', status_code=status.HTTP_404_NOT_FOUND)
from rest_framework.decorators import api_view, permission_classes
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def trivia_list_create(request):
    if request.method == 'GET':
        building_id = request.query_params.get('building_id')
        if building_id:
            from .models import TriviaFact
            trivias = TriviaFact.objects.filter(building_id=building_id).order_by('-created_at')
        else:
            from .models import TriviaFact
            trivias = TriviaFact.objects.all().order_by('-created_at')
        from .serializers import TriviaFactSerializer
        return success_response(TriviaFactSerializer(trivias, many=True).data)
    elif request.method == 'POST':
        if not request.user.is_admin_role:
            return error_response(ErrorCodes.PERMISSION_DENIED, 'Admin access required', status_code=status.HTTP_403_FORBIDDEN)
        from .serializers import TriviaFactSerializer
        serializer = TriviaFactSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return success_response(serializer.data, status_code=status.HTTP_201_CREATED)
        return error_response(ErrorCodes.VALIDATION_ERROR, 'Invalid data', status_code=status.HTTP_400_BAD_REQUEST, details=serializer.errors)

@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def trivia_detail(request, id):
    if not request.user.is_admin_role:
        return error_response(ErrorCodes.PERMISSION_DENIED, 'Admin access required', status_code=status.HTTP_403_FORBIDDEN)
    try:
        from .models import TriviaFact
        trivia = TriviaFact.objects.get(id=id)
    except Exception:
        return error_response(ErrorCodes.NOT_FOUND, 'Trivia not found', status_code=status.HTTP_404_NOT_FOUND)

    if request.method == 'PATCH':
        from .serializers import TriviaFactSerializer
        serializer = TriviaFactSerializer(trivia, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return success_response(serializer.data)
        return error_response(ErrorCodes.VALIDATION_ERROR, 'Invalid data', status_code=status.HTTP_400_BAD_REQUEST, details=serializer.errors)
    elif request.method == 'DELETE':
        trivia.delete()
        return success_response({'message': 'Trivia deleted'})
