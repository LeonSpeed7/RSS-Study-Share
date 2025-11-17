import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Home, Upload } from "lucide-react";
import Layout from "@/components/Layout";

const UploadSuccess = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-12">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-3xl">Upload Successful!</CardTitle>
            <CardDescription className="text-lg">
              Your note has been uploaded successfully
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Button
                onClick={() => navigate("/")}
                className="w-full"
                size="lg"
              >
                <Home className="w-4 h-4 mr-2" />
                Return to Home
              </Button>
              <Button
                onClick={() => navigate("/upload")}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Another Note
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default UploadSuccess;
