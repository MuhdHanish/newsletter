import React, { useRef, useState, useEffect } from "react";
import EmailEditor from "react-email-editor";
import GalleryModal from "./GalleryModal";
import { getPhotoFiles, uploadPhotoFiles, getImageDimensions } from "../lib";
import SendMailModal from "./SendMailModal";
import { MDBBtn } from "mdb-react-ui-kit";
import { read, utils } from "xlsx";
import { saveAs } from "file-saver";

const Index = () => {
  const emailEditorRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isOpenMailModal, setIsOpenMailModal] = useState(false);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [rawFiles, setRawFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const photosRef = useRef([]);
  const [mailContent, setMailContent] = useState("");
  const [emailArray, setEmailArray] = useState([]);

  const toggleModal = () => {
    setIsOpen((prev) => !prev);
  };

  const toggleMailModal = () => {
    setIsOpenMailModal((prev) => !prev);
  };

  useEffect(() => {
    const fetchData = async () => {
      const res = await getPhotoFiles();
      photosRef.current = res.data;
      setPhotoFiles(res.data);
    };
    fetchData();
    return () => {};
  }, []);

  const exportHtml = () => {
    if (emailEditorRef.current !== null) {
      emailEditorRef.current.editor.exportHtml((data) => {
        localStorage.setItem("newsletter", JSON.stringify(data));
        if (data.html) {
          setMailContent(data.html);
          toggleMailModal();
        }
      });
    }
  };

  const onLoad = () => {
    const editorRef = emailEditorRef.current;
    if (editorRef !== null) {
      editorRef.registerCallback("selectImage", function (_data, done) {
        setIsOpen(true);
        done({
          height: 20,
          width: 10,
          size: 400,
          url: "https://cdn.tools.unlayer.com/image/placeholder.png",
        });
      });
    }
  };

  const handleFileInputChange = async (e) => {
    const _files = e.target.files;
    if (_files) {
      const files = Array.from(_files);
      const _results = [];
      for (const file of files) {
        const result = await getImageDimensions(file);
        _results.push(result);
      }
      setRawFiles(_results);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    try {
      if (rawFiles.length < 1) return null;
      setLoading(true);
      let i = 0;
      const formData = new FormData();
      for (const item of rawFiles) {
        let file = item.file;
        let width = item.height;
        let height = item.height;
        formData.append(`info_${i}`, JSON.stringify({ width, height }));
        formData.append("mediaFile", file);
        i++;
      }
      const res = await uploadPhotoFiles(formData);
      setLoading(false);
      if (res.error) {
        toggleModal();
        return alert(res.message);
      }
      setRawFiles([]);
      photosRef.current = [...res.data, ...photoFiles];
      setPhotoFiles((prev) => [...res.data, ...prev]);
    } catch (error) {
      setLoading(false);
    }
  };

  const handleExcelImport = (e) => {
    const file = e.target.files[0];

    const reader = new FileReader();
    reader.onload = function (e) {
      const data = new Uint8Array(e.target.result);
      const workbook = read(data, { type: "array" });

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = utils.sheet_to_json(worksheet, { header: 1 });

      const extractedEmailArray = [];

      jsonData.forEach((row) => {
        row.forEach((cell) => {
          if (typeof cell === "string" && cell.includes("@")) {
            const email = cell.trim();
            if (email !== "" && validateEmail(email)) {
              extractedEmailArray.push(email);
            }
          }
        });
      });

      setEmailArray(extractedEmailArray);
    };

    reader.readAsArrayBuffer(file);
  };

  const validateEmail = (email) => {
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    return emailRegex.test(email);
  };

  return (
    <div>
      <div className="export_button">
        <MDBBtn onClick={() => exportHtml()}>Send Newsletter</MDBBtn>
      </div>

      <input
        type="file"
        accept=".xlsx, .xls"
        onChange={handleExcelImport}
      />

      {emailArray.length > 0 && (
        <div>
          <h4>Extracted Emails:</h4>
          <ul>
            {emailArray.map((email, index) => (
              <li key={index}>{email}</li>
            ))}
          </ul>
        </div>
      )}

      <EmailEditor
        editorId="editor_container"
        ref={emailEditorRef}
        onLoad={onLoad}
      />
      <GalleryModal
        isOpen={isOpen}
        photoFiles={photoFiles}
        toggleModal={toggleModal}
        handleFileUpload={handleFileUpload}
        handleFileInputChange={handleFileInputChange}
        rawFiles={rawFiles}
        loading={loading}
      />
      <SendMailModal {...{ toggleMailModal, mailContent, isOpenMailModal }} />
    </div>
  );
};

export default Index;
