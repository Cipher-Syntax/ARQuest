import factory
from django.utils import timezone
from .models import Building, Department, Geofence, BuildingUnlock, BuildingAsset
from apps.authentication.factories import UserFactory

class DepartmentFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Department

    name = factory.Sequence(lambda n: f"Department {n}")
    code = factory.Sequence(lambda n: f"DEPT-{n}")
    description = factory.Faker("text", max_nb_chars=200)
    color_hex = "#7F0303"
    is_active = True

class BuildingFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Building

    name = factory.Sequence(lambda n: f"Building {n}")
    slug = factory.Sequence(lambda n: f"building-{n}")
    description = factory.Faker("text")
    latitude = factory.Faker("pydecimal", left_digits=2, right_digits=6, positive=True, min_value=6.0, max_value=7.0)
    longitude = factory.Faker("pydecimal", left_digits=3, right_digits=6, positive=True, min_value=122.0, max_value=123.0)
    status = 'VISIBLE'
    is_active = True
    
    primary_department = factory.SubFactory(DepartmentFactory)

    @factory.post_generation
    def departments(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            for dept in extracted:
                self.departments.add(dept)

class GeofenceFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Geofence
        
    building = factory.SubFactory(BuildingFactory)
    latitude = factory.SelfAttribute('building.latitude')
    longitude = factory.SelfAttribute('building.longitude')
    radius_meters = 20.0
    is_active = True

class BuildingUnlockFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = BuildingUnlock
        
    user = factory.SubFactory(UserFactory)
    building = factory.SubFactory(BuildingFactory)
    source = 'geofence'

class BuildingAssetFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = BuildingAsset
        
    building = factory.SubFactory(BuildingFactory)
    asset_type = 'model'
    file = factory.django.FileField(filename='test_model.glb')
    version = 1
    is_active = True
