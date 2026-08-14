import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import './SubmitPRModal.css';

export function SubmitPRModal({ providerKey, providerName, pendingChanges, rawData, onClose, onSuccess }) {
  const [showAuthBlock, setShowAuthBlock] = useState(false);
  const [githubPat, setGithubPat] = useState('');
  const [commitMessage, setCommitMessage] = useState('Update provider data');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [diffJsonStr, setDiffJsonStr] = useState('');
  
  // New state for draft provider
  const [draftName, setDraftName] = useState('');
  const [draftWebsite, setDraftWebsite] = useState('');
  const [draftGithub, setDraftGithub] = useState('');
  const [draftDescription, setDraftDescription] = useState('Draft of a new provider for filling and proposing changes.');

  // Helper to generate a key from a name
  const generateKey = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'draft';

  // 1. Build JSON Diff or Full JSON when modal opens or inputs change
  useEffect(() => {
    if (providerKey === 'draft') {
      // Build Full JSON for Draft
      const fullData = JSON.parse(JSON.stringify(rawData));
      fullData.name = draftName || 'Draft';
      fullData.key = generateKey(draftName);
      fullData.website = draftWebsite;
      fullData.github = draftGithub;
      fullData.description = draftDescription;

      // Apply pending changes
      Object.keys(pendingChanges || {}).forEach(featureName => {
        if (!fullData.features) fullData.features = {};
        const targetFeature = fullData.features[featureName] || {};
        
        targetFeature.status = pendingChanges[featureName].status;
        if (pendingChanges[featureName].comment) {
          targetFeature.comment = pendingChanges[featureName].comment;
        } else {
          delete targetFeature.comment;
        }
        fullData.features[featureName] = targetFeature;
      });

      if (fullData.icon) delete fullData.icon;
      
      setDiffJsonStr(JSON.stringify(fullData, null, 2));
      return;
    }

    // Normal Provider Diff Logic
    if (!pendingChanges || Object.keys(pendingChanges).length === 0) {
      setDiffJsonStr('{\n  "error": "No changes found."\n}');
      return;
    }

    const diffObject = {
      name: providerName,
      key: providerKey,
      type: 'soft', // currently hardcoded for soft (from app.js logic)
      changes: {
        features: {}
      }
    };

    Object.keys(pendingChanges).forEach(featureName => {
      const modVal = pendingChanges[featureName];
      const origFeature = (rawData.features && rawData.features[featureName]) || {};
      
      const origStatus = origFeature.status || "";
      const origComment = origFeature.comment || "";
      const modStatus = modVal.status || "";
      const modComment = modVal.comment || "";
      
      const featureDiff = {
        status: { before: origStatus, after: modStatus }
      };
      if (origComment !== modComment) {
        featureDiff.comment = { before: origComment, after: modComment };
      }
      
      diffObject.changes.features[featureName] = featureDiff;
    });

    setDiffJsonStr(JSON.stringify(diffObject, null, 2));
  }, [providerKey, providerName, pendingChanges, rawData, draftName, draftWebsite, draftGithub, draftDescription]);

  // 2. Build full provider JSON (for the actual commit)
  const buildFullCommitJson = () => {
    if (providerKey === 'draft') {
      return diffJsonStr; // Already the full JSON
    }

    // Deep clone the raw data
    const fullData = JSON.parse(JSON.stringify(rawData));
    
    // Apply pending changes
    Object.keys(pendingChanges).forEach(featureName => {
      if (!fullData.features) fullData.features = {};
      const targetFeature = fullData.features[featureName] || {};
      targetFeature.status = pendingChanges[featureName].status;
      if (pendingChanges[featureName].comment) {
        targetFeature.comment = pendingChanges[featureName].comment;
      } else {
        delete targetFeature.comment; 
      }
      fullData.features[featureName] = targetFeature;
    });
    
    if (fullData.icon) delete fullData.icon;
    
    return JSON.stringify(fullData, null, 2);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(diffJsonStr).then(() => {
      alert('Changes (JSON) successfully copied to clipboard!');
    }).catch(err => {
      alert('Failed to copy to clipboard: ' + err);
    });
  };

  const handleSubmitPR = async () => {
    const token = githubPat.trim();
    if (!token) {
      alert("Please enter your Personal Access Token for GitHub authorization.");
      return;
    }

    setIsSubmitting(true);

    try {
      const repoName = "USBridge-Technologies/Remote-Access-Feature-Matrix";
      
      // 1. Get main branch sha
      const refRes = await fetch(`https://api.github.com/repos/${repoName}/git/ref/heads/main`, {
        headers: { "Authorization": `token ${token}` }
      });
      if (!refRes.ok) throw new Error("Failed to get main branch hash. Please check your token validity.");
      const refData = await refRes.json();
      const mainSha = refData.object.sha;

      // 2. Create new branch
      const newBranchName = `patch-${providerKey}-${Date.now().toString().slice(-5)}`;
      const branchRes = await fetch(`https://api.github.com/repos/${repoName}/git/refs`, {
        method: "POST",
        headers: { 
          "Authorization": `token ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ref: `refs/heads/${newBranchName}`,
          sha: mainSha
        })
      });
      if (!branchRes.ok) throw new Error("Failed to create branch on GitHub.");

      // 3. Get existing file sha for normal providers
      // In the GitHub repo, the data is under docs/software/providers/
      const isDraft = providerKey === 'draft';
      const actualKey = isDraft ? generateKey(draftName) : providerKey;
      const fileUrl = `https://api.github.com/repos/${repoName}/contents/docs/software/providers/${actualKey}.json`;
      let fileSha = undefined;

      if (!isDraft) {
        const fileRes = await fetch(fileUrl, {
          headers: { "Authorization": `token ${token}` }
        });
        if (!fileRes.ok) throw new Error("Failed to get existing file from GitHub.");
        const fileData = await fileRes.json();
        fileSha = fileData.sha;
      }

      // 4. Update file (or create if no sha)
      const contentJson = buildFullCommitJson();
      const encoder = new TextEncoder();
      const encodedBytes = encoder.encode(contentJson);
      let binaryStr = '';
      for (let i = 0; i < encodedBytes.length; i++) {
        binaryStr += String.fromCharCode(encodedBytes[i]);
      }
      const base64Content = btoa(binaryStr);

      const commitPayload = {
        message: commitMessage || (isDraft ? "Add new provider" : "Update provider data"),
        content: base64Content,
        branch: newBranchName
      };
      if (fileSha) commitPayload.sha = fileSha;

      const commitRes = await fetch(fileUrl, {
        method: "PUT",
        headers: { 
          "Authorization": `token ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(commitPayload)
      });
      if (!commitRes.ok) throw new Error("Failed to commit provider file.");

      // 5. Create Pull Request
      const prUrl = `https://api.github.com/repos/${repoName}/pulls`;
      let prBody = `User proposed changes to provider matrix database.\n\nChanges Summary:\n\`\`\`json\n${diffJsonStr}\n\`\`\``;
      if (isDraft) {
        prBody = `User proposed a new provider for the matrix database.\n\nJSON:\n\`\`\`json\n${diffJsonStr}\n\`\`\``;
      }

      const prRes = await fetch(prUrl, {
        method: "POST",
        headers: { 
          "Authorization": `token ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: isDraft ? `Add new provider: ${draftName || 'Draft'}` : `Proposed changes for ${providerName}`,
          head: newBranchName,
          base: "main",
          body: prBody
        })
      });
      
      if (!prRes.ok) {
        const prErrData = await prRes.json();
        throw new Error(prErrData.message || "Failed to automatically create PR.");
      }
      
      const prData = await prRes.json();
      alert(`Success! Pull Request successfully created on GitHub.\nLink: ${prData.html_url}`);
      
      onSuccess(); // Close modal and reset editing mode

    } catch (err) {
      alert("Submission error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="submit-pr-overlay" onClick={handleBackdropClick}>
      <div className="submit-pr-content">
        <button className="submit-pr-close" onClick={onClose}><X size={20} /></button>
        <h2 className="submit-pr-title">Submit provider changes to GitHub</h2>
        <p className="submit-pr-desc">
          Below are the parameters for the selected provider. You can copy this JSON or submit it directly via a Pull Request.
        </p>

        {providerKey === 'draft' && (
          <div className="submit-pr-draft-fields">
            <h3 className="draft-fields-title">New software provider information</h3>
            <div className="draft-fields-grid">
              <div className="form-group">
                <label>Provider Name *:</label>
                <input type="text" className="submit-pr-input" value={draftName} onChange={e => setDraftName(e.target.value)} placeholder="e.g.: MyRemoteDesktop" />
              </div>
              <div className="form-group">
                <label>Official Website:</label>
                <input type="text" className="submit-pr-input" value={draftWebsite} onChange={e => setDraftWebsite(e.target.value)} placeholder="https://example.com" />
              </div>
              <div className="form-group">
                <label>GitHub Link:</label>
                <input type="text" className="submit-pr-input" value={draftGithub} onChange={e => setDraftGithub(e.target.value)} placeholder="https://github.com/..." />
              </div>
              <div className="form-group">
                <label>Short Description:</label>
                <input type="text" className="submit-pr-input" value={draftDescription} onChange={e => setDraftDescription(e.target.value)} placeholder="Short description..." />
              </div>
            </div>
          </div>
        )}

        <div className="submit-pr-diff-box">
          <label>{providerKey === 'draft' ? 'Full new provider file (JSON):' : 'Modified provider file (diff):'}</label>
          <textarea 
            className="submit-pr-textarea"
            readOnly
            value={diffJsonStr}
          />
        </div>

        {showAuthBlock && (
          <div className="submit-pr-auth-block">
            <div className="submit-pr-form-group">
              <label>GitHub Personal Access Token (PAT):</label>
              <input 
                type="password" 
                className="submit-pr-input" 
                placeholder="github_pat_..."
                value={githubPat}
                onChange={(e) => setGithubPat(e.target.value)}
              />
            </div>
            <div className="submit-pr-form-group">
              <label>Commit Message:</label>
              <input 
                type="text" 
                className="submit-pr-input"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
              />
            </div>
            <button 
              className="submit-pr-send-btn" 
              onClick={handleSubmitPR}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending PR...' : 'Send Pull Request'}
            </button>
          </div>
        )}

        <div className="submit-pr-actions">
          <button 
            className="submit-pr-auto-btn" 
            onClick={() => setShowAuthBlock(!showAuthBlock)}
          >
            Auto-commit / PR
          </button>
          <button className="submit-pr-copy-btn" onClick={handleCopyJson}>
            Copy JSON
          </button>
        </div>
      </div>
    </div>
  );
}
