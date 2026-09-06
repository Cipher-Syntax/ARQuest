from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from apps.authentication.models import User
from apps.buildings.models import Building
from .models import NavigationNode, NavigationPath
from .router import haversine_distance, find_nearest_node, astar


class NavigationRouterAndModelTestCase(TestCase):
    def setUp(self):
        self.node_a = NavigationNode.objects.create(
            label='Main Gate',
            latitude=6.9120,
            longitude=122.0600,
            node_type='gate'
        )
        self.node_b = NavigationNode.objects.create(
            label='Central Junction',
            latitude=6.9125,
            longitude=122.0605,
            node_type='junction'
        )
        self.node_c = NavigationNode.objects.create(
            label='CICS Entrance',
            latitude=6.9130,
            longitude=122.0610,
            node_type='entrance'
        )
        self.node_isolated = NavigationNode.objects.create(
            label='Far Away Island',
            latitude=6.9200,
            longitude=122.0700,
            node_type='poi'
        )

        self.path_ab = NavigationPath.objects.create(
            start_node=self.node_a,
            end_node=self.node_b,
            geometry=[[122.0600, 6.9120], [122.0605, 6.9125]]
        )
        self.path_bc = NavigationPath.objects.create(
            start_node=self.node_b,
            end_node=self.node_c,
            geometry=[[122.0605, 6.9125], [122.0610, 6.9130]]
        )

    def test_haversine_distance(self):
        dist = haversine_distance(6.9120, 122.0600, 6.9125, 122.0605)
        self.assertGreater(dist, 50)
        self.assertLess(dist, 150)

    def test_navigation_path_auto_calculates_distance(self):
        self.assertGreater(self.path_ab.distance_meters, 0)
        self.assertGreater(self.path_bc.distance_meters, 0)

    def test_find_nearest_node(self):
        nodes = [self.node_a, self.node_b, self.node_c]
        nearest = find_nearest_node(nodes, 6.9119, 122.0599)
        self.assertEqual(nearest.id, self.node_a.id)

    def test_astar_direct_route(self):
        nodes = NavigationNode.objects.all()
        paths = NavigationPath.objects.all()
        route = astar(nodes, paths, self.node_a, self.node_b)
        self.assertIsNotNone(route)
        self.assertEqual(len(route), 1)
        self.assertEqual(route[0].id, self.path_ab.id)

    def test_astar_multi_hop_route(self):
        nodes = NavigationNode.objects.all()
        paths = NavigationPath.objects.all()
        route = astar(nodes, paths, self.node_a, self.node_c)
        self.assertIsNotNone(route)
        self.assertEqual(len(route), 2)
        self.assertEqual([p.id for p in route], [self.path_ab.id, self.path_bc.id])

    def test_astar_bidirectional_route(self):
        nodes = NavigationNode.objects.all()
        paths = NavigationPath.objects.all()
        # Route from C to A (paths are directed A->B and B->C in DB, A* should still traverse C->B->A)
        route = astar(nodes, paths, self.node_c, self.node_a)
        self.assertIsNotNone(route)
        self.assertEqual(len(route), 2)

    def test_astar_disconnected_returns_none(self):
        nodes = NavigationNode.objects.all()
        paths = NavigationPath.objects.all()
        route = astar(nodes, paths, self.node_a, self.node_isolated)
        self.assertIsNone(route)


class NavigationApiTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.admin_user = User.objects.create_user(
            username='adminuser',
            email='admin@wmsu.edu.ph',
            password='Password123!',
            role='admin'
        )
        self.student_user = User.objects.create_user(
            username='studentuser',
            email='student@wmsu.edu.ph',
            password='Password123!',
            role='student'
        )

        self.building = Building.objects.create(
            name='College of Science',
            slug='college-of-science',
            latitude=6.9130,
            longitude=122.0610,
            is_active=True,
            status='VISIBLE'
        )

        self.entrance_node = NavigationNode.objects.create(
            label='CS Entrance',
            latitude=6.9130,
            longitude=122.0610,
            node_type='entrance',
            building=self.building
        )

        self.gate_node = NavigationNode.objects.create(
            label='Main Gate',
            latitude=6.9120,
            longitude=122.0600,
            node_type='gate'
        )

        self.path = NavigationPath.objects.create(
            start_node=self.gate_node,
            end_node=self.entrance_node,
            geometry=[[122.0600, 6.9120], [122.0605, 6.9125], [122.0610, 6.9130]]
        )

    def test_get_nodes_authenticated(self):
        self.client.force_authenticate(user=self.student_user)
        res = self.client.get('/api/navigation/nodes/')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['success'])
        self.assertGreaterEqual(len(res.data['data']), 2)

    def test_post_node_admin_success(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            'label': 'New POI',
            'latitude': 6.9150,
            'longitude': 122.0620,
            'node_type': 'poi'
        }
        res = self.client.post('/api/navigation/nodes/', payload, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.data['success'])
        self.assertEqual(res.data['data']['label'], 'New POI')

    def test_post_node_student_forbidden(self):
        self.client.force_authenticate(user=self.student_user)
        payload = {
            'label': 'Hacker Node',
            'latitude': 6.9150,
            'longitude': 122.0620,
            'node_type': 'poi'
        }
        res = self.client.post('/api/navigation/nodes/', payload, format='json')
        self.assertEqual(res.status_code, 403)

    def test_patch_node_admin_success(self):
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.patch(
            f'/api/navigation/nodes/{self.gate_node.id}/',
            {'label': 'Updated Main Gate'},
            format='json'
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['data']['label'], 'Updated Main Gate')

    def test_delete_node_admin_success(self):
        self.client.force_authenticate(user=self.admin_user)
        # Delete entrance node (first remove path to avoid cascade confusion)
        self.path.delete()
        res = self.client.delete(f'/api/navigation/nodes/{self.entrance_node.id}/')
        self.assertEqual(res.status_code, 200)
        self.assertFalse(NavigationNode.objects.filter(pk=self.entrance_node.id).exists())

    def test_get_paths_authenticated(self):
        self.client.force_authenticate(user=self.student_user)
        res = self.client.get('/api/navigation/paths/')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['success'])
        self.assertEqual(len(res.data['data']), 1)

    def test_post_path_admin_success(self):
        self.client.force_authenticate(user=self.admin_user)
        new_node = NavigationNode.objects.create(
            label='Gym Entrance', latitude=6.9140, longitude=122.0620, node_type='entrance'
        )
        payload = {
            'start_node': str(self.gate_node.id),
            'end_node': str(new_node.id),
            'geometry': [[122.0600, 6.9120], [122.0620, 6.9140]]
        }
        res = self.client.post('/api/navigation/paths/', payload, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.data['success'])
        self.assertGreater(res.data['data']['distance_meters'], 0)

    def test_post_path_student_forbidden(self):
        self.client.force_authenticate(user=self.student_user)
        payload = {
            'start_node': str(self.gate_node.id),
            'end_node': str(self.entrance_node.id),
            'geometry': [[122.0600, 6.9120], [122.0610, 6.9130]]
        }
        res = self.client.post('/api/navigation/paths/', payload, format='json')
        self.assertEqual(res.status_code, 403)

    def test_route_missing_params(self):
        self.client.force_authenticate(user=self.student_user)
        res = self.client.get('/api/navigation/route/')
        self.assertEqual(res.status_code, 400)
        self.assertFalse(res.data['success'])

    def test_route_nonexistent_building(self):
        self.client.force_authenticate(user=self.student_user)
        import uuid
        res = self.client.get(f'/api/navigation/route/?from_lat=6.9120&from_lng=122.0600&to_building_id={uuid.uuid4()}')
        self.assertEqual(res.status_code, 404)

    def test_route_success_geojson(self):
        self.client.force_authenticate(user=self.student_user)
        res = self.client.get(
            f'/api/navigation/route/?from_lat=6.9120&from_lng=122.0600&to_building_id={self.building.id}'
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['success'])
        geojson = res.data['data']
        self.assertEqual(geojson['type'], 'FeatureCollection')
        self.assertGreater(len(geojson['features']), 0)
        feature = geojson['features'][0]
        self.assertEqual(feature['geometry']['type'], 'LineString')
        self.assertGreater(len(feature['geometry']['coordinates']), 1)
        self.assertIn('distance_meters', feature['properties'])
        self.assertIn('estimated_minutes', feature['properties'])

    def test_route_unreachable_returns_404(self):
        # Create a building with an entrance that has NO paths connected to it
        isolated_building = Building.objects.create(
            name='Isolated Hall',
            slug='isolated-hall',
            latitude=6.9300,
            longitude=122.0800,
            is_active=True
        )
        NavigationNode.objects.create(
            label='Isolated Entrance',
            latitude=6.9300,
            longitude=122.0800,
            node_type='entrance',
            building=isolated_building
        )
        self.client.force_authenticate(user=self.student_user)
        res = self.client.get(
            f'/api/navigation/route/?from_lat=6.9120&from_lng=122.0600&to_building_id={isolated_building.id}'
        )
        self.assertEqual(res.status_code, 404)
        self.assertFalse(res.data['success'])
