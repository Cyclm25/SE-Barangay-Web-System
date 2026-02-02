import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { MapPin, Phone, Mail, Clock, Users, Award, Target, Heart } from 'lucide-react';
import imgImage3 from "../../assets/citybg.png";

export function AboutUs() {
  const services = [
    'Barangay Clearance',
    'Certificate of Residency',
    'Certificate of Indigency',
    'Business Permit',
    'Barangay ID',
    'Community Tax Certificate',
    'Complaint Resolution',
    'Disaster Assistance',
  ];

  const officials = [
    { position: 'Barangay Captain', name: 'Hon. Maria Santos' },
    { position: 'Kagawad', name: 'Hon. Juan Dela Cruz' },
    { position: 'Kagawad', name: 'Hon. Ana Reyes' },
    { position: 'SK Chairman', name: 'Hon. Pedro Garcia' },
    { position: 'Secretary', name: 'Rosa Martinez' },
    { position: 'Treasurer', name: 'Carlos Ramos' },
  ];

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      {/* Header */}
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-lg">
            <img src={imgImage3} alt="Barangay Logo" className="w-28 h-28 object-cover" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Barangay Management System</h1>
        <p className="text-lg text-gray-600 mt-2">Serving Our Community with Excellence</p>
      </div>

      {/* Mission and Vision */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-[#2957a1]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#2957a1]">
              <Target className="w-6 h-6" />
              Our Mission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">
              To provide efficient, transparent, and responsive governance that promotes the welfare and development of our barangay. We are committed to delivering quality public services, fostering community participation, and ensuring peace and order in our community.
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#2957a1]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#2957a1]">
              <Award className="w-6 h-6" />
              Our Vision
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">
              A progressive, peaceful, and sustainable barangay where every resident has access to basic services, opportunities for growth, and a safe environment. We envision a community united in purpose, working together towards common goals.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Core Values */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#2957a1]">
            <Heart className="w-6 h-6" />
            Core Values
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <h3 className="font-bold text-gray-900 mb-2">Integrity</h3>
              <p className="text-sm text-gray-600">
                Upholding honesty and strong moral principles in all our actions
              </p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <h3 className="font-bold text-gray-900 mb-2">Service</h3>
              <p className="text-sm text-gray-600">
                Dedicated to serving the needs of our community members
              </p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <h3 className="font-bold text-gray-900 mb-2">Transparency</h3>
              <p className="text-sm text-gray-600">
                Open and accountable in all barangay operations and decisions
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#2957a1]">
            <MapPin className="w-6 h-6" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#2957a1] mt-1" />
                <div>
                  <h4 className="font-semibold text-gray-900">Address</h4>
                  <p className="text-gray-600">Barangay Hall, Main Street</p>
                  <p className="text-gray-600">City, Province 1234</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-[#2957a1] mt-1" />
                <div>
                  <h4 className="font-semibold text-gray-900">Phone Numbers</h4>
                  <p className="text-gray-600">Hotline: (02) 1234-5678</p>
                  <p className="text-gray-600">Mobile: 0917-123-4567</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-[#2957a1] mt-1" />
                <div>
                  <h4 className="font-semibold text-gray-900">Email Address</h4>
                  <p className="text-gray-600">barangay@example.gov.ph</p>
                  <p className="text-gray-600">info@barangay.gov.ph</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-[#2957a1] mt-1" />
                <div>
                  <h4 className="font-semibold text-gray-900">Office Hours</h4>
                  <p className="text-gray-600">Monday - Friday: 8:00 AM - 5:00 PM</p>
                  <p className="text-gray-600">Saturday: 8:00 AM - 12:00 PM</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services Offered */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#2957a1]">
            <Users className="w-6 h-6" />
            Services Offered
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {services.map((service, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <div className="w-2 h-2 bg-[#2957a1] rounded-full" />
                <span className="text-sm text-gray-700">{service}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Barangay Officials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#2957a1]">
            <Users className="w-6 h-6" />
            Barangay Officials
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {officials.map((official, index) => (
              <div
                key={index}
                className="p-4 border rounded-lg hover:shadow-md transition-shadow"
              >
                <p className="text-sm font-semibold text-[#2957a1]">{official.position}</p>
                <p className="text-gray-900 mt-1">{official.name}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card className="bg-gradient-to-r from-[#2957a1] to-[#1e3f7a] text-white">
        <CardContent className="p-6">
          <div className="text-center">
            <h3 className="text-xl font-bold mb-2">About This System</h3>
            <p className="text-blue-100 mb-4">
              This Barangay Management System is designed to streamline administrative processes, improve service delivery, and enhance transparency in barangay operations. Our digital platform allows for efficient management of resident records, document requests, and community announcements.
            </p>
            <p className="text-sm text-blue-200">
              Version 1.0 | © 2025 Barangay Management System. All rights reserved.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
